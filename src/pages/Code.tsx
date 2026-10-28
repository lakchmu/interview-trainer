import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Markdown } from '../components/Markdown'
import type { AppData } from '../App'
import { CODE_SETS, CODE_TASKS } from '../trainer/tasks'
import type { CodeTask, CodeTest } from '../trainer/tasks'
import runnerSource from '../trainer/runner.js?raw'
// Настоящие Vue и Pinia для задач с env: 'vue'. Берутся текстом и кладутся в
// начало кода Worker: там нет ни модулей, ни доступа к сборке страницы.
// Пути — относительные, а не по имени пакета: Pinia не объявляет dist/ в своём
// поле exports, и импорт «pinia/dist/…» сборщик отклоняет.
import vueSource from '../../node_modules/vue/dist/vue.runtime.global.prod.js?raw'
import piniaSource from '../../node_modules/pinia/dist/pinia.iife.prod.js?raw'

/**
 * Тренажёр кода: условие, пустое поле и тесты.
 *
 * Поле — обычный textarea, и это намеренно: на интервью без ИИ нет ни
 * автодополнения, ни подсказок, и руки должны вспомнить синтаксис сами.
 * Результат показан парой «ожидалось / получено» по каждому тесту — чтобы
 * читать то, что код вернул на самом деле, а не то, что он должен был вернуть.
 */

type TestResult = { ok: boolean; actual?: string; expected: string; error?: string }
type RunResult = { results?: TestResult[]; logs: string[]; fatal?: string }
type Solved = Record<string, { ts: number; seconds: number }>
/** Итог «что выведет код»: совпал ли ответ с настоящим выводом. */
type Verdict = { ok: boolean }

const RUN_LIMIT_MS = 4000
const TARGET_SECONDS = 15 * 60
const PREDICT_SECONDS = 3 * 60

// Черновики и отметки «решено» живут в браузере: серверу они не нужны, а
// страница должна работать и без перезапуска приложения.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // переполненное или отключённое хранилище — не повод ломать страницу
  }
}

const codeKey = (id: string) => `trainer.code.${id}`
const SOLVED_KEY = 'trainer.solved'

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Подпись теста: сам вызов, как его написал бы человек. */
function testLabel(task: CodeTask, test: CodeTest) {
  if (test.label) return test.label
  const args = (test.args ?? []).map((a) => JSON.stringify(a)).join(', ')
  const call = `${task.fn}(${args})`
  return call.length > 78 ? `${call.slice(0, 75)}…)` : call
}

/**
 * Ответ на «что выведет код» сравнивается по словам: неважно, записан вывод
 * по строкам или через пробел, с кавычками у строк или без, с запятыми между
 * значениями или без. Запятые внутри значения ('1,10,2') остаются.
 */
function words(text: string) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^['"`«]+|['"`»,;]+$/g, ''))
    .filter(Boolean)
}

function sameOutput(answer: string, output: string[]) {
  const a = words(answer)
  const b = words(output.join('\n'))
  return a.length === b.length && a.every((w, i) => w === b[i])
}

/**
 * Окружение задач на React — почти полмегабайта: React, рендерер без DOM и
 * транспилятор JSX. Грузится отдельным файлом, только когда открыта такая задача.
 */
let reactEnv: Promise<string> | null = null
const loadReactEnv = () => (reactEnv ??= import('../trainer/vendor/react-env.js?raw').then((m) => m.default))

async function workerParts(task: CodeTask) {
  if (task.env === 'vue') return [vueSource, '\n;', piniaSource, '\n;', runnerSource]
  if (task.env === 'react') return [await loadReactEnv(), '\n;', runnerSource]
  return [runnerSource]
}

async function runInWorker(task: CodeTask, source: string): Promise<RunResult> {
  const parts = await workerParts(task)
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob(parts, { type: 'text/javascript' }))
    const worker = new Worker(url)
    const finish = (result: RunResult) => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const timer = setTimeout(
      () =>
        finish({
          logs: [],
          fatal:
            'Код не завершился за 4 секунды. Обычно это бесконечный цикл или промис, который никогда не выполняется.',
        }),
      RUN_LIMIT_MS,
    )
    worker.onmessage = (e: MessageEvent<RunResult>) => finish(e.data)
    worker.onerror = (e) => finish({ logs: [], fatal: e.message || 'Ошибка при запуске кода' })
    worker.postMessage({ source, name: task.fn, tests: task.tests, env: task.env, mode: task.kind })
  })
}

export function Code({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams()
  const [solved, setSolved] = useState<Solved>(() => load<Solved>(SOLVED_KEY, {}))

  // Куда открыть страницу: на названную задачу, иначе на первую нерешённую в
  // названном наборе, иначе на первую нерешённую вообще.
  const initial = useMemo(() => {
    const byId = CODE_TASKS.find((t) => t.id === params.get('task'))
    if (byId) return byId.id
    const pool = params.get('set') ? CODE_TASKS.filter((t) => t.set === params.get('set')) : CODE_TASKS
    const list = pool.length ? pool : CODE_TASKS
    return (list.find((t) => !solved[t.id]) ?? list[0]).id
  }, [])

  const [taskId, setTaskId] = useState(initial)
  const task = CODE_TASKS.find((t) => t.id === taskId) ?? CODE_TASKS[0]

  const [code, setCode] = useState(() => load(codeKey(task.id), task.starter))
  const [result, setResult] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [running, setRunning] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  /** Когда начали писать эту задачу. null — ещё не тронута. */
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const area = useRef<HTMLTextAreaElement>(null)

  const open = (id: string) => {
    const next = CODE_TASKS.find((t) => t.id === id)
    if (!next) return
    setTaskId(id)
    setCode(load(codeKey(id), next.starter))
    setResult(null)
    setVerdict(null)
    setShowSolution(false)
    setStartedAt(null)
    setParams({ task: id }, { replace: true })
  }

  useEffect(() => {
    if (startedAt === null || solved[task.id]) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt, solved, task.id])

  const elapsed = startedAt === null ? 0 : Math.floor((now - startedAt) / 1000)

  const edit = (value: string) => {
    setCode(value)
    save(codeKey(task.id), value)
    if (startedAt === null) {
      setStartedAt(Date.now())
      setNow(Date.now())
    }
  }

  const markSolved = useCallback(async () => {
    if (solved[task.id]) return
    // От момента первой буквы, а не по тикающему счётчику: тот обновляется раз в секунду
    const seconds = startedAt === null ? 0 : Math.round((Date.now() - startedAt) / 1000)
    const next = { ...solved, [task.id]: { ts: Date.now(), seconds } }
    setSolved(next)
    save(SOLVED_KEY, next)

    // Решён весь набор — закрываем его шаг в расписании
    const set = CODE_SETS.find((s) => s.id === task.set)
    const complete = CODE_TASKS.filter((t) => t.set === task.set).every((t) => next[t.id])
    if (set?.step && complete) {
      try {
        await api.programStep(set.step, true)
        await data.reload()
        data.toast('Набор решён — шаг в расписании закрыт')
      } catch {
        // шага с таким именем в расписании может уже не быть — это не ошибка
      }
    }
  }, [task, solved, startedAt, data])

  const run = useCallback(async () => {
    if (running) return
    setRunning(true)
    const res = await runInWorker(task, task.kind === 'predict' ? task.code ?? '' : code)
    setResult(res)
    setRunning(false)
    if (res.results && res.results.every((r) => r.ok)) await markSolved()
  }, [running, task, code, markSolved])

  /** «Что выведет код»: сверить ответ с настоящим выводом и открыть разбор. */
  const check = useCallback(async () => {
    if (!code.trim()) return
    const ok = sameOutput(code, task.output ?? [])
    setVerdict({ ok })
    setShowSolution(true)
    if (ok) await markSolved()
  }, [code, task, markSolved])

  const predict = task.kind === 'predict'
  const submit = predict ? check : run

  const reset = () => {
    setCode(task.starter)
    save(codeKey(task.id), task.starter)
    setResult(null)
    setVerdict(null)
    setShowSolution(false)
    setStartedAt(null)
    area.current?.focus()
  }

  /** Вставка с сохранением отмены по ⌘Z: прямое присваивание value её стирает. */
  const insert = (text: string) => {
    const el = area.current
    if (!el) return
    el.focus()
    if (!document.execCommand('insertText', false, text)) {
      const { selectionStart: a, selectionEnd: b, value } = el
      edit(value.slice(0, a) + text + value.slice(b))
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void submit()
      return
    }
    // В ответе на «что выведет» отступы не нужны: обычные Tab и Enter
    if (predict) return
    if (e.key === 'Tab') {
      e.preventDefault()
      insert('  ')
      return
    }
    if (e.key === 'Enter') {
      // Новая строка с тем же отступом, после открывающей скобки — на шаг глубже.
      // Это всё удобство, какое тут есть: скобки не закрываются, слова не дописываются.
      const el = e.currentTarget
      const before = el.value.slice(0, el.selectionStart)
      const line = before.slice(before.lastIndexOf('\n') + 1)
      const indent = line.match(/^\s*/)?.[0] ?? ''
      const deeper = /[{[(]\s*$/.test(line) ? '  ' : ''
      e.preventDefault()
      insert(`\n${indent}${deeper}`)
    }
  }

  const passed = result?.results?.filter((r) => r.ok).length ?? 0
  const total = result?.results?.length ?? 0
  const done = solved[task.id]
  const position = CODE_TASKS.findIndex((t) => t.id === task.id)
  const nextTask = CODE_TASKS.slice(position + 1).find((t) => !solved[t.id]) ?? CODE_TASKS.find((t) => !solved[t.id] && t.id !== task.id)
  const solvedCount = CODE_TASKS.filter((t) => solved[t.id]).length

  return (
    <>
      <h1>Код руками</h1>
      <p className="subtitle">
        Решено {solvedCount} из {CODE_TASKS.length} · без автодополнения и подсказок, как на интервью
      </p>

      <div className="notes-layout code-layout">
        <div className="notes-list">
          {CODE_SETS.map((set) => (
            <div key={set.id}>
              <div className="note-folder">{set.title}</div>
              {CODE_TASKS.filter((t) => t.set === set.id).map((t) => (
                <div
                  key={t.id}
                  className={`note-file ${t.id === task.id ? 'active' : ''}`}
                  onClick={() => open(t.id)}
                >
                  {solved[t.id] ? '✓ ' : ''}
                  {t.title}
                  <small>
                    {solved[t.id]
                      ? `решено за ${clock(solved[t.id].seconds)}`
                      : t.kind === 'predict'
                        ? 'что выведет код'
                        : `${t.tests.length} ${plural(t.tests.length, 'тест', 'теста', 'тестов')}`}
                  </small>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="code-main">
          <section className="card-surface code-statement">
            <div className="row between">
              <h2>{task.title}</h2>
              {done && <span className="pill notes">решено за {clock(done.seconds)}</span>}
            </div>
            <Markdown text={task.statement} />
            {predict && <Markdown text={`\`\`\`js\n${task.code}\n\`\`\``} />}
          </section>

          <section className="card-surface code-editor">
            <div className="row between code-toolbar">
              <span className={`code-timer ${!done && elapsed > (predict ? PREDICT_SECONDS : TARGET_SECONDS) ? 'late' : ''}`}>
                {done ? clock(done.seconds) : clock(elapsed)}
                <small>
                  {done
                    ? 'решено'
                    : startedAt === null
                      ? 'таймер пойдёт с первой буквы'
                      : predict
                        ? 'ориентир — 3 минуты'
                        : 'ориентир — 15 минут'}
                </small>
              </span>
              <div className="row">
                <button className="btn ghost sm" onClick={reset}>
                  Начать заново
                </button>
                {predict ? (
                  <button className="btn primary" disabled={!code.trim()} onClick={() => void check()}>
                    Проверить
                  </button>
                ) : (
                  <button className="btn primary" disabled={running} onClick={() => void run()}>
                    {running ? 'Выполняю…' : 'Запустить'}
                  </button>
                )}
              </div>
            </div>
            <textarea
              ref={area}
              className={predict ? 'predict' : undefined}
              placeholder={predict ? 'Вывод по строкам, например:\n1\n4\n6' : undefined}
              value={code}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              wrap="off"
              aria-label={predict ? 'Что выведет код' : 'Код решения'}
              onChange={(e) => edit(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {predict ? (
              <p className="hint">
                <span className="kbd">⌘</span> <span className="kbd">↵</span> — проверить · по строке на{' '}
                <code>console.log</code> или через пробел · сначала рассуждай вслух
              </p>
            ) : (
              <p className="hint">
                <span className="kbd">⌘</span> <span className="kbd">↵</span> — запустить · <code>console.log</code>{' '}
                работает, вывод появится под тестами · проговаривай решение вслух
              </p>
            )}
          </section>

          {predict && verdict && (
            <section className={`card-surface code-results code-verdict ${verdict.ok ? 'ok' : 'fail'}`}>
              <div className="row between">
                <h2>{verdict.ok ? '✓ Верно' : '✕ Не совпало'}</h2>
                {verdict.ok && nextTask && (
                  <button className="btn sm" onClick={() => open(nextTask.id)}>
                    Следующая: {nextTask.title}
                  </button>
                )}
              </div>
              <div className="code-verdict-cols">
                <div>
                  <b>Настоящий вывод</b>
                  <pre>{(task.output ?? []).join('\n')}</pre>
                </div>
                {!verdict.ok && (
                  <div>
                    <b>Твой ответ</b>
                    <pre className="mine">{code.trim()}</pre>
                  </div>
                )}
              </div>
              <div className="row">
                <button className="btn ghost sm" disabled={running} onClick={() => void run()}>
                  {running ? 'Выполняю…' : 'Запустить код и посмотреть самой'}
                </button>
              </div>
            </section>
          )}

          {result && (
            <section className="card-surface code-results">
              {predict ? (
                <h2>Вывод при запуске</h2>
              ) : result.fatal ? (
                <div className="code-fatal">
                  <b>Код не запустился</b>
                  <pre>{result.fatal}</pre>
                </div>
              ) : (
                <>
                  <div className="row between">
                    <h2>
                      {passed === total ? 'Все тесты прошли' : `Прошло ${passed} из ${total}`}
                    </h2>
                    {passed === total && nextTask && (
                      <button className="btn sm" onClick={() => open(nextTask.id)}>
                        Следующая: {nextTask.title}
                      </button>
                    )}
                  </div>
                  {passed < total && (
                    <p className="hint">Сравни пары «ожидалось» и «получено»: ошибка обычно видна в первой же несовпавшей.</p>
                  )}
                  <div className="code-tests">
                    {result.results!.map((r, i) => (
                      <div className={`code-test ${r.ok ? 'ok' : 'fail'}`} key={i}>
                        <span className="code-test-mark">{r.ok ? '✓' : '✕'}</span>
                        <div className="code-test-body">
                          <code className="code-test-call">{testLabel(task, task.tests[i])}</code>
                          {!r.ok && (
                            <dl>
                              <dt>ожидалось</dt>
                              <dd>
                                <code>{r.expected}</code>
                              </dd>
                              <dt>{r.error ? 'ошибка' : 'получено'}</dt>
                              <dd>
                                <code>{r.error ?? r.actual}</code>
                              </dd>
                            </dl>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {result.logs.length > 0 && (
                <div className={predict ? 'code-logs bare' : 'code-logs'}>
                  <b>console.log</b>
                  <pre>{result.logs.join('\n')}</pre>
                </div>
              )}
            </section>
          )}

          <section className="card-surface code-solution">
            <div className="row between">
              <span className="hint" style={{ margin: 0 }}>
                {predict
                  ? 'Сначала ответь сама — разбор откроется после проверки.'
                  : 'Не пошло за 15 минут — посмотри решение и перепиши его своими руками, не копируя.'}
              </span>
              <div className="row">
                {task.card && (
                  <Link className="btn ghost sm" to={`/cards?q=${encodeURIComponent(task.card)}`}>
                    Разбор в карточке
                  </Link>
                )}
                <button className="btn sm" onClick={() => setShowSolution((v) => !v)}>
                  {showSolution ? (predict ? 'Скрыть разбор' : 'Скрыть решение') : predict ? 'Показать разбор' : 'Показать решение'}
                </button>
              </div>
            </div>
            {showSolution && <Markdown text={predict ? task.solution : `\`\`\`js\n${task.solution}\n\`\`\``} />}
          </section>
        </div>
      </div>
    </>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
