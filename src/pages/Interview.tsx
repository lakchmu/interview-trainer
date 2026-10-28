import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { Markdown } from '../components/Markdown'
import type { AppData } from '../App'
import type { Card, Checkup, Verdict } from '../types'

const VERDICTS: { id: Verdict; label: string; hint: string; key: string }[] = [
  { id: 'no', label: 'Не отвечу', hint: 'не знаю или знаю обрывками', key: '1' },
  { id: 'weak', label: 'Плаваю', hint: 'общая идея есть, деталей нет', key: '2' },
  { id: 'know', label: 'Отвечу', hint: 'могу рассказать связно', key: '3' },
]

const VERDICT_LABEL: Record<Verdict, string> = {
  know: 'отвечу',
  weak: 'плаваю',
  no: 'не отвечу',
}

export function Interview({ data }: { data: AppData }) {
  const [questions, setQuestions] = useState<Card[] | null>(null)
  const [checkups, setCheckups] = useState<Checkup[]>([])
  const [mode, setMode] = useState<'list' | 'run' | 'result'>('list')
  const [order, setOrder] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<Record<string, Verdict>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [saved, setSaved] = useState<Checkup | null>(null)

  const load = useCallback(async () => {
    const res = await api.interview()
    setQuestions(res.questions)
    setCheckups(res.checkups)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const last = checkups.at(-1) ?? null
  const previous = checkups.at(-2) ?? null

  /** Вопросы, сгруппированные по темам — в порядке появления. */
  const byTopic = useMemo(() => {
    const map = new Map<string, { title: string; items: Card[] }>()
    for (const q of questions ?? []) {
      if (!map.has(q.topic)) map.set(q.topic, { title: q.topicTitle, items: [] })
      map.get(q.topic)!.items.push(q)
    }
    return [...map.entries()]
  }, [questions])

  const startRun = (subset?: Card[]) => {
    const pool = subset ?? questions ?? []
    setOrder(pool)
    setIndex(0)
    setRevealed(false)
    setResults({})
    setSaved(null)
    setMode('run')
  }

  const answer = useCallback(
    (verdict: Verdict) => {
      const card = order[index]
      if (!card) return
      const next = { ...results, [card.id]: verdict }
      setResults(next)
      setRevealed(false)
      if (index + 1 < order.length) {
        setIndex(index + 1)
      } else {
        void api.saveCheckup(next).then((checkup) => {
          data.celebrate(checkup.reward)
          setSaved(checkup)
          setCheckups((prev) => [...prev, checkup])
          setMode('result')
        })
      }
    },
    [order, index, results],
  )

  useEffect(() => {
    if (mode !== 'run') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === ' ') {
        e.preventDefault()
        setRevealed(true)
        return
      }
      const found = VERDICTS.find((v) => v.key === e.key)
      if (found) {
        e.preventDefault()
        answer(found.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, answer])

  if (!questions) return <div className="subtitle">Загрузка…</div>

  // ------------------------------------------------------------ прогон

  if (mode === 'run') {
    const card = order[index]
    if (!card) return null
    return (
      <div className="review-wrap">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="hint">
            Вопрос {index + 1} из {order.length}
          </span>
          <button className="btn ghost sm" onClick={() => setMode('list')}>
            Прервать
          </button>
        </div>
        <div className="progress-track">
          <i style={{ width: `${(index / order.length) * 100}%` }} />
        </div>

        <article className="flashcard" data-source={card.source}>
          <div className="flashcard-meta">
            <span className="pill ghost">{card.topicTitle}</span>
            <span className="pill ghost">{card.level}</span>
          </div>

          {card.asked && <blockquote className="asked">{card.asked}</blockquote>}
          <Markdown text={card.question} className="question" />

          {revealed ? (
            <div className="answer">
              <Markdown text={card.answer} />
            </div>
          ) : (
            <p className="reveal-hint" style={{ marginBottom: 0 }}>
              <button className="btn sm" onClick={() => setRevealed(true)}>
                Подсмотреть ответ
              </button>
              <br />
              <span style={{ fontSize: 12 }}>
                Сначала ответь вслух, потом сверься — иначе проверка ничего не покажет
              </span>
            </p>
          )}

          <div className="grade-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {VERDICTS.map((v) => (
              <button key={v.id} className="grade" data-verdict={v.id} onClick={() => answer(v.id)}>
                <b>{v.label}</b>
                <small>{v.hint}</small>
                <span className="kbd">{v.key}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    )
  }

  // ------------------------------------------------------------ итог

  if (mode === 'result' && saved) {
    const weakIds = Object.entries(saved.results)
      .filter(([, v]) => v !== 'know')
      .map(([id]) => id)
    const weakCards = questions.filter((q) => weakIds.includes(q.id))
    const percent = Math.round((saved.know / saved.total) * 100)
    const prevPercent = previous ? Math.round((previous.know / previous.total) * 100) : null

    const perTopic = byTopic
      .map(([topic, { title, items }]) => {
        const scored = items.filter((i) => saved.results[i.id])
        return {
          topic,
          title,
          total: scored.length,
          know: scored.filter((i) => saved.results[i.id] === 'know').length,
          weak: scored.filter((i) => saved.results[i.id] === 'weak').length,
        }
      })
      .filter((t) => t.total > 0)
      .sort((a, b) => a.know / a.total - b.know / b.total)

    return (
      <>
        <h1>Результат проверки</h1>
        <p className="subtitle">
          Уверенно отвечаешь на <b>{saved.know}</b> из {saved.total} вопросов — {percent}%
          {prevPercent !== null && (
            <>
              {' '}
              (в прошлый раз {prevPercent}%
              {percent !== prevPercent && `, ${percent > prevPercent ? '+' : ''}${percent - prevPercent}`})
            </>
          )}
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="value" style={{ color: 'var(--ok)' }}>{saved.know}</div>
            <div className="label">отвечу уверенно</div>
          </div>
          <div className="stat">
            <div className="value" style={{ color: 'var(--warn)' }}>{saved.weak}</div>
            <div className="label">плаваю</div>
          </div>
          <div className="stat">
            <div className="value" style={{ color: 'var(--bad)' }}>{saved.no}</div>
            <div className="label">не отвечу</div>
          </div>
        </div>

        <h2>По темам — слабое сверху</h2>
        <div className="card-surface">
          {perTopic.map((t) => (
            <div className="topic-row" key={t.topic}>
              <div className="topic-name">
                {t.title}
                <small>
                  {t.know} из {t.total} уверенно
                </small>
              </div>
              <div className="bar">
                <span className="b-mature" style={{ width: `${(t.know / t.total) * 100}%` }} />
                <span className="b-learning" style={{ width: `${(t.weak / t.total) * 100}%` }} />
              </div>
              <span className="pill ghost">{Math.round((t.know / t.total) * 100)}%</span>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button
            className="btn primary"
            disabled={weakIds.length === 0}
            onClick={async () => {
              const res = await api.checkupToReview(weakIds)
              data.toast(`В очередь повторения добавлено: ${res.reset}`)
              await data.reload()
            }}
          >
            Отправить провалы в повторение ({weakIds.length})
          </button>
          <button className="btn" onClick={() => setMode('list')}>
            К списку вопросов
          </button>
          {weakCards.length > 0 && (
            <button className="btn" onClick={() => startRun(weakCards)}>
              Перепройти только провалы
            </button>
          )}
        </div>

        {weakCards.length > 0 && (
          <>
            <h2>Что доучить</h2>
            <div className="card-surface">
              {weakCards.map((c) => (
                <div className="topic-row" key={c.id} style={{ gridTemplateColumns: '1fr 110px' }}>
                  <div className="topic-name">
                    {plain(c.question)}
                    <small>{c.topicTitle}</small>
                  </div>
                  <span className={`pill ${saved.results[c.id] === 'no' ? 'manual' : ''}`}>
                    {VERDICT_LABEL[saved.results[c.id]]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    )
  }

  // ------------------------------------------------------------ список

  return (
    <>
      <div className="row between">
        <h1>Вопросы ревьюера</h1>
        <button className="btn primary" onClick={() => startRun()}>
          Экспресс-проверка ({questions.length})
        </button>
      </div>
      <p className="subtitle">
        {questions.length} вопросов — ровно то, что спрашивали на реальном собеседовании, дословно.
        {last
          ? ` Последняя проверка: ${new Date(last.ts).toLocaleDateString('ru')} — ${Math.round(
              (last.know / last.total) * 100,
            )}% уверенных ответов.`
          : ' Проверка ещё не проводилась.'}
      </p>

      {last && (
        <div className="card-surface" style={{ marginBottom: 20 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>Итог последней проверки</b>
            <span className="hint">{new Date(last.ts).toLocaleString('ru')}</span>
          </div>
          <div className="bar" style={{ height: 12 }}>
            <span className="b-mature" style={{ width: `${(last.know / last.total) * 100}%` }} />
            <span className="b-learning" style={{ width: `${(last.weak / last.total) * 100}%` }} />
            <span style={{ width: `${(last.no / last.total) * 100}%`, background: 'var(--bad)' }} />
          </div>
          <p className="hint">
            отвечу {last.know} · плаваю {last.weak} · не отвечу {last.no}
          </p>
        </div>
      )}

      {byTopic.map(([topic, { title, items }]) => {
        const scored = last ? items.filter((i) => last.results[i.id]) : []
        const known = scored.filter((i) => last!.results[i.id] === 'know').length
        return (
          <div key={topic} style={{ marginBottom: 22 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <div className="row" style={{ gap: 8 }}>
                {scored.length > 0 && (
                  <span className="pill ghost">
                    {known} из {scored.length} уверенно
                  </span>
                )}
                <button className="btn ghost sm" onClick={() => startRun(items)}>
                  Проверить тему
                </button>
              </div>
            </div>

            {items.map((card) => {
              const verdict = last?.results[card.id]
              return (
                <div className="list-item" data-source={card.source} key={card.id}>
                  <div
                    className="list-head"
                    onClick={() => setOpen((id) => (id === card.id ? null : card.id))}
                  >
                    <span className={`verdict-dot ${verdict ?? 'none'}`} title={verdict ? VERDICT_LABEL[verdict] : 'не проверялось'} />
                    <div className="list-q">
                      <div className="truncate">{plain(card.question)}</div>
                    </div>
                    <span className="pill ghost">{card.level}</span>
                    <span className="pill ghost">{open === card.id ? '−' : '+'}</span>
                  </div>

                  {open === card.id && (
                    <div className="list-body">
                      {card.asked && <blockquote className="asked">{card.asked}</blockquote>}
                      <Markdown text={card.question} className="question" />
                      <div className="answer">
                        <Markdown text={card.answer} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
