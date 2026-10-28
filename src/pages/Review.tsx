import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { preview } from '../../shared/srs.js'
import { Markdown } from '../components/Markdown'
import type { AppData } from '../App'
import type { Card, Grade, QueueResponse } from '../types'

const SOURCE_LABEL: Record<string, string> = {
  generated: 'сгенерировано',
  notes: 'из конспекта',
  manual: 'своя',
}

const GRADES: { g: Grade; label: string; key: string }[] = [
  { g: 0, label: 'Снова', key: '1' },
  { g: 1, label: 'Трудно', key: '2' },
  { g: 2, label: 'Хорошо', key: '3' },
  { g: 3, label: 'Легко', key: '4' },
]

export function Review({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams()
  const topicFilter = params.get('topic') ?? ''
  const sourceFilter = params.get('source') ?? ''
  const tagFilter = params.get('tag') ?? ''
  /** Пункт программы подготовки — очередь только из его карточек. */
  const programFilter = params.get('program') ?? ''
  /** scope=all снимает фокус на программе на одну сессию. */
  const scopeFilter = params.get('scope') ?? ''

  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)
  const shownAt = useRef(Date.now())
  const [busy, setBusy] = useState(false)

  const byId = useMemo(() => new Map(data.cards.map((c) => [c.id, c])), [data.cards])

  const loadQueue = useCallback(async () => {
    const res = await api.queue(
      topicFilter ? [topicFilter] : [],
      sourceFilter ? [sourceFilter] : [],
      tagFilter ? [tagFilter] : [],
      { program: programFilter, scope: scopeFilter },
    )
    setQueue(res)
    setIndex(0)
    setRevealed(false)
    shownAt.current = Date.now()
  }, [topicFilter, sourceFilter, tagFilter, programFilter, scopeFilter])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const currentId = queue?.queue[index]
  const card = currentId ? byId.get(currentId) : undefined

  const grade = useCallback(
    async (g: Grade) => {
      if (!card || busy) return
      setBusy(true)
      try {
        const res = await api.review(card.id, g, Date.now() - shownAt.current)
        data.celebrate(res.reward)
        setDone((d) => d + 1)
        // «Снова» возвращает карточку в конец текущей сессии — как в Anki
        setQueue((q) => {
          if (!q) return q
          const next = [...q.queue]
          if (g === 0) next.push(card.id)
          return { ...q, queue: next }
        })
        setIndex((i) => i + 1)
        setRevealed(false)
        shownAt.current = Date.now()
        await data.reload()
      } finally {
        setBusy(false)
      }
    },
    [card, busy, data],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else void grade(2)
        return
      }
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        void grade((Number(e.key) - 1) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, grade])

  if (!queue) return <div className="subtitle">Собираю очередь…</div>

  const setFilter = (key: 'topic' | 'source' | 'tag' | 'program' | 'scope', value: string) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }

  const topics = [...new Map(data.cards.map((c) => [c.topic, c.topicTitle])).entries()]

  // Пунктов может быть несколько через запятую — так ведёт шаг расписания
  const programTopics = programFilter
    ? [...(data.program?.blocks ?? []), ...(data.program?.adjacent ? [data.program.adjacent] : [])]
        .flatMap((b) => b.topics)
        .filter((t) => programFilter.split(',').includes(t.id))
    : []
  const programLabel =
    programTopics.length > 3
      ? `${programTopics[0].title} и ещё ${programTopics.length - 1}`
      : programTopics.map((t) => t.title).join(', ')

  // Чем ограничена очередь — видно всегда: иначе непонятно, куда делся React.
  const scopeBar = programFilter ? (
    <div className="scope-bar">
      <span>
        {programTopics.length > 1 ? 'Пункты программы' : 'Пункт программы'}: <b>{programLabel || programFilter}</b>
      </span>
      <button className="btn ghost sm" onClick={() => setFilter('program', '')}>
        Вся очередь
      </button>
    </div>
  ) : queue.focused ? (
    <div className="scope-bar">
      <span>
        В очереди только <b>{data.program?.listName}</b>: темы вне списка отложены
      </span>
      <button className="btn ghost sm" onClick={() => setFilter('scope', 'all')}>
        Показать все темы
      </button>
    </div>
  ) : scopeFilter === 'all' && data.program?.focus ? (
    <div className="scope-bar">
      <span>Очередь по всем темам, включая те, что вне программы</span>
      <button className="btn ghost sm" onClick={() => setFilter('scope', '')}>
        Вернуть фокус
      </button>
    </div>
  ) : null

  const filterBar = (
    <div className="filters">
      <select value={topicFilter} onChange={(e) => setFilter('topic', e.target.value)}>
        <option value="">Все темы</option>
        {topics.map(([id, title]) => (
          <option key={id} value={id}>
            {title}
          </option>
        ))}
      </select>
      <select value={sourceFilter} onChange={(e) => setFilter('source', e.target.value)}>
        <option value="">Любой источник</option>
        <option value="generated">Сгенерированные</option>
        <option value="notes">Из конспектов</option>
        <option value="manual">Свои</option>
      </select>
      <select value={tagFilter} onChange={(e) => setFilter('tag', e.target.value)}>
        <option value="">Все карточки</option>
        <option value="устно">Только ответы вслух</option>
        <option value="грабли">Только подводные камни</option>
        <option value="код">Только код</option>
        <option value="таблица">Только таблицы</option>
      </select>
      <span className="spacer" />
      <span className="pill ghost">разобрано за сессию: {done}</span>
    </div>
  )

  if (!card) {
    return (
      <div className="review-wrap">
        <h1>Повторение</h1>
        {scopeBar}
        {filterBar}
        <div className="empty">
          <h3>{done > 0 ? 'Сессия закончена' : 'На сейчас ничего не запланировано'}</h3>
          <p>
            {done > 0
              ? `Разобрано карточек: ${done}. Следующие подойдут по расписанию.`
              : 'Либо всё повторено, либо исчерпан дневной лимит новых карточек.'}
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button className="btn" onClick={() => void loadQueue()}>
              Обновить очередь
            </button>
            <Link className="btn" to="/settings">
              Изменить лимиты
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const total = queue.queue.length
  const progress = total ? (index / total) * 100 : 0

  return (
    <div className="review-wrap">
      {scopeBar}
      {filterBar}
      <div className="progress-track">
        <i style={{ width: `${progress}%` }} />
      </div>

      <article className="flashcard" data-source={card.source}>
        <div className="flashcard-meta">
          <span className={`pill ${card.source}`}>{SOURCE_LABEL[card.source]}</span>
          <span className="pill ghost">{card.topicTitle}</span>
          <span className="pill ghost">{card.level}</span>
          {card.tags.slice(0, 3).map((tag) => (
            <span className="pill" key={tag}>
              #{tag}
            </span>
          ))}
          <span className="spacer" />
          <span className="pill ghost">
            {index + 1} / {total}
          </span>
        </div>

        {card.asked && <blockquote className="asked">{card.asked}</blockquote>}
        <Markdown text={card.question} className="question" />

        {revealed ? (
          <>
            <div className="answer">
              <Markdown text={card.answer} />
              {card.sourceFile && (
                <p className="hint">
                  Источник: <code>{card.sourceFile}</code>
                </p>
              )}
            </div>
            <div className="grade-row">
              {GRADES.map(({ g, label, key }) => (
                <button
                  key={g}
                  className="grade"
                  data-g={g}
                  disabled={busy}
                  onClick={() => void grade(g)}
                >
                  <b>{label}</b>
                  <small>{preview(card.srs, g)}</small>
                  <span className="kbd">{key}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="reveal-hint">
              <button className="btn primary" onClick={() => setRevealed(true)}>
                Показать ответ
              </button>
              <p style={{ marginTop: 10 }}>
                <span className="kbd">Space</span> — показать, затем{' '}
                <span className="kbd">1</span>–<span className="kbd">4</span> — оценка
              </p>
            </div>
          </>
        )}
      </article>

      <div className="row" style={{ marginTop: 14 }}>
        <CardActions card={card} data={data} onDone={() => setIndex((i) => i + 1)} />
        <span className="spacer" />
        <span className="hint">
          осталось: {Math.max(0, total - index)} · новых в очереди: {queue.counts.new}
        </span>
      </div>
    </div>
  )
}

function CardActions({ card, data, onDone }: { card: Card; data: AppData; onDone: () => void }) {
  return (
    <>
      <button
        className="btn ghost sm"
        onClick={async () => {
          await api.suspend(card.id)
          data.toast('Карточка отложена')
          await data.reload()
          onDone()
        }}
      >
        Отложить
      </button>
      <button
        className="btn ghost sm"
        onClick={async () => {
          await api.resetCard(card.id)
          data.toast('Прогресс карточки сброшен')
          await data.reload()
        }}
      >
        Сбросить прогресс
      </button>
      <Link className="btn ghost sm" to={`/cards?q=${encodeURIComponent(card.question.slice(0, 40))}`}>
        Открыть в списке
      </Link>
    </>
  )
}
