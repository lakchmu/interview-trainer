import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Markdown } from '../components/Markdown'
import type { AppData } from '../App'
import type { QuizAttempt, QuizBundle, QuizQuestion } from '../types'

/** Ответ считается верным, только если набор выбранных вариантов совпал полностью. */
function isCorrect(question: QuizQuestion, picked: number[]) {
  const right = question.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0)
  return right.length === picked.length && right.every((i) => picked.includes(i))
}

/** Тасование Фишера — Йетса: копия массива в случайном порядке. */
function shuffled<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function Quiz({ data }: { data: AppData }) {
  const [bundles, setBundles] = useState<QuizBundle[] | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [active, setActive] = useState<QuizBundle | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [finished, setFinished] = useState<QuizAttempt | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await api.quiz()
    setBundles(res.bundles)
    setAttempts(res.attempts)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Последняя попытка по каждому разделу. */
  const lastByTopic = useMemo(() => {
    const map = new Map<string, QuizAttempt>()
    for (const a of attempts) map.set(a.topic, a)
    return map
  }, [attempts])

  const cardById = useMemo(() => new Map(data.cards.map((c) => [c.id, c])), [data.cards])

  const start = (bundle: QuizBundle) => {
    // Варианты перемешиваются на каждую попытку. В файлах верный ответ всегда
    // записан первым, и без этого тест проходился бы не глядя. Перемешанная
    // копия живёт до конца попытки, поэтому экран разбора видит тот же порядок,
    // в котором отвечали.
    setActive({
      ...bundle,
      questions: bundle.questions.map((q) => ({ ...q, options: shuffled(q.options) })),
    })
    setIndex(0)
    setPicked([])
    setAnswers({})
    setFinished(null)
    setOpen(null)
  }

  // Переход из плана подготовки: /quiz?topic=vue сразу открывает нужный тест.
  // Параметр снимаем, чтобы «назад к списку» не запускал тест заново.
  const [params, setParams] = useSearchParams()
  const wanted = params.get('topic')
  useEffect(() => {
    if (!wanted || !bundles) return
    const bundle = bundles.find((b) => b.topic === wanted)
    if (bundle) start(bundle)
    setParams({}, { replace: true })
  }, [wanted, bundles])

  const submit = async () => {
    if (!active) return
    const question = active.questions[index]
    const next = { ...answers, [question.id]: picked }
    setAnswers(next)
    setPicked([])

    if (index + 1 < active.questions.length) {
      setIndex(index + 1)
      return
    }

    const results: Record<string, boolean> = {}
    let combo = 0
    let bestCombo = 0
    for (const q of active.questions) {
      const ok = isCorrect(q, next[q.id] ?? [])
      results[q.id] = ok
      combo = ok ? combo + 1 : 0
      if (combo > bestCombo) bestCombo = combo
    }
    const attempt = await api.saveQuizAttempt({
      topic: active.topic,
      total: active.questions.length,
      correct: Object.values(results).filter(Boolean).length,
      results,
      bestCombo,
    })
    data.celebrate(attempt.reward)
    setFinished(attempt)
    setAttempts((prev) => [...prev, attempt])
  }

  if (!bundles) return <div className="subtitle">Загрузка…</div>

  if (bundles.length === 0) {
    return (
      <>
        <h1>Мини-тесты</h1>
        <div className="empty">
          <h3>Тестов пока нет</h3>
          <p>
            Добавь файл в <code>data/quiz/</code> и перезапусти приложение.
          </p>
        </div>
      </>
    )
  }

  // ------------------------------------------------------------ результаты

  if (active && finished) {
    const percent = Math.round((finished.correct / finished.total) * 100)
    const previous = attempts.filter((a) => a.topic === active.topic).at(-2)
    const prevPercent = previous ? Math.round((previous.correct / previous.total) * 100) : null
    const wrong = active.questions.filter((q) => !finished.results[q.id])

    return (
      <>
        <h1>{active.title}</h1>
        <p className="subtitle">
          Верно <b>{finished.correct}</b> из {finished.total} — {percent}%
          {prevPercent !== null && (
            <>
              {' '}
              (прошлая попытка {prevPercent}%
              {percent !== prevPercent && `, ${percent > prevPercent ? '+' : ''}${percent - prevPercent}`})
            </>
          )}
        </p>

        <div className="quiz-score" data-level={percent >= 80 ? 'high' : percent >= 55 ? 'mid' : 'low'}>
          <div className="quiz-score-bar">
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="hint" style={{ margin: '8px 0 0' }}>
            {percent >= 80
              ? 'Фактура держится. Осталось проговорить это вслух — тест устный ответ не заменяет.'
              : percent >= 55
                ? 'Основное знаешь, но границы плывут. Разбери ошибки ниже и вернись к разделу.'
                : 'Раздел не закрыт. Стоит пройти карточки темы, а тест перепройти после.'}
          </p>
        </div>

        <div className="row" style={{ margin: '20px 0' }}>
          <button className="btn primary" onClick={() => start(active)}>
            Пройти заново
          </button>
          <button className="btn" onClick={() => setActive(null)}>
            К списку тестов
          </button>
          <Link className="btn" to={`/review?topic=${active.topic}`}>
            Учить карточки раздела
          </Link>
        </div>

        <h2>
          Разбор {wrong.length > 0 && <span className="pill ghost">ошибок: {wrong.length}</span>}
        </h2>
        {active.questions.map((q, qi) => {
          const chosen = answers[q.id] ?? []
          const ok = finished.results[q.id]
          const card = q.card ? cardById.get(q.card) : null
          return (
            <div className={`list-item quiz-review ${ok ? 'ok' : 'fail'}`} key={q.id}>
              <div
                className="list-head"
                onClick={() => setOpen((id) => (id === q.id ? null : q.id))}
              >
                <span className={`quiz-mark ${ok ? 'ok' : 'fail'}`}>{ok ? '✓' : '✕'}</span>
                <div className="list-q">
                  <div className="truncate">
                    {qi + 1}. {plain(q.question)}
                  </div>
                </div>
                <span className="pill ghost">{open === q.id ? '−' : 'разбор'}</span>
              </div>

              {open === q.id && (
                <div className="list-body">
                  <Markdown text={q.question} className="question" />
                  <ul className="quiz-options review">
                    {q.options.map((o, oi) => {
                      const state = o.ok ? 'right' : chosen.includes(oi) ? 'wrong' : ''
                      return (
                        <li key={oi} className={state}>
                          <span className="quiz-marker">
                            {o.ok ? '✓' : chosen.includes(oi) ? '✕' : ''}
                          </span>
                          <span>{o.t}</span>
                          {chosen.includes(oi) && <em className="quiz-yours">твой выбор</em>}
                        </li>
                      )
                    })}
                  </ul>
                  <div className="quiz-why">
                    <Markdown text={q.why} />
                    {card && (
                      <p className="hint" style={{ marginBottom: 0 }}>
                        Полный разбор —{' '}
                        <Link to={`/cards?q=${encodeURIComponent(plain(card.question).slice(0, 45))}`}>
                          карточка «{plain(card.question).slice(0, 60)}»
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  // ------------------------------------------------------------ прохождение

  if (active) {
    const question = active.questions[index]
    const multi = question.kind === 'multi'

    const toggle = (i: number) => {
      if (multi) setPicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
      else setPicked([i])
    }

    return (
      <div className="review-wrap">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="hint">
            {active.title} · вопрос {index + 1} из {active.questions.length}
          </span>
          <button className="btn ghost sm" onClick={() => setActive(null)}>
            Прервать
          </button>
        </div>
        <div className="progress-track">
          <i style={{ width: `${(index / active.questions.length) * 100}%` }} />
        </div>

        <article className="flashcard">
          <div className="flashcard-meta">
            <span className={`pill ${multi ? 'gen' : 'ghost'}`}>
              {multi ? 'выберите все верные' : 'один верный ответ'}
            </span>
          </div>

          <Markdown text={question.question} className="question" />

          <ul className="quiz-options">
            {question.options.map((o, i) => (
              <li key={i} className={picked.includes(i) ? 'picked' : ''}>
                <button type="button" onClick={() => toggle(i)}>
                  <span className={`quiz-box ${multi ? 'multi' : ''}`}>
                    {picked.includes(i) ? (multi ? '✓' : '●') : ''}
                  </span>
                  <span>{o.t}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn primary" disabled={picked.length === 0} onClick={() => void submit()}>
              {index + 1 === active.questions.length ? 'Завершить тест' : 'Ответить'}
            </button>
            <span className="hint">
              {multi ? 'Верных вариантов может быть несколько' : 'Разбор всех вопросов — в конце'}
            </span>
          </div>
        </article>
      </div>
    )
  }

  // ------------------------------------------------------------ список тестов

  const totalQuestions = bundles.reduce((sum, b) => sum + b.questions.length, 0)

  return (
    <>
      <h1>Мини-тесты по разделам</h1>
      <p className="subtitle">
        {totalQuestions} вопросов с вариантами ответов — проверка фактуры: границы, отличия,
        типичные ошибки. Разбор каждого вопроса открывается после прохождения.
      </p>

      <div className="card-surface" style={{ marginBottom: 22 }}>
        <p className="hint" style={{ margin: 0 }}>
          ⚠️ Тест проверяет <b>узнавание</b>, а собеседование — <b>умение рассказать вслух</b>.
          Высокий процент здесь не означает, что ответ готов, поэтому результат теста намеренно не
          влияет на «Проверку уровня». Используй его как быструю сверку фактов, а не как замену
          устному проходу.
        </p>
      </div>

      {bundles.map((bundle) => {
        const last = lastByTopic.get(bundle.topic)
        const percent = last ? Math.round((last.correct / last.total) * 100) : null
        return (
          <div className="list-item quiz-topic" key={bundle.topic}>
            <div className="list-head" style={{ cursor: 'default' }}>
              <div className="list-q">
                <div style={{ fontWeight: 550 }}>{bundle.title}</div>
                <span className="hint">
                  {bundle.questions.length} вопросов
                  {last
                    ? ` · последний результат ${percent}% (${new Date(last.ts).toLocaleDateString('ru')})`
                    : ' · ещё не проходился'}
                </span>
              </div>
              {percent !== null && (
                <span
                  className="pill"
                  data-level={percent >= 80 ? 'high' : percent >= 55 ? 'mid' : 'low'}
                >
                  {percent}%
                </span>
              )}
              <button className="btn sm primary" onClick={() => start(bundle)}>
                Пройти
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}

function plain(question: string) {
  return question
    .split('\n')[0]
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}
