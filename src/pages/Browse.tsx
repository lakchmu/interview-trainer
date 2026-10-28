import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Markdown } from '../components/Markdown'
import { CardEditor } from '../components/CardEditor'
import type { AppData } from '../App'
import type { Card, Source } from '../types'

const SOURCES: { id: Source; label: string }[] = [
  { id: 'generated', label: 'Сгенерированные' },
  { id: 'notes', label: 'Из конспектов' },
  { id: 'manual', label: 'Свои' },
]

/** Первая строка вопроса без markdown-разметки — для компактного списка. */
function plainTitle(question: string) {
  return question
    .split('\n')[0]
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s*/, '')
    .trim()
}

const STATE_LABEL: Record<string, string> = {
  new: 'новая',
  learning: 'учится',
  relearning: 'повторно',
  review: 'на повторении',
}

export function Browse({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [topic, setTopic] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [state, setState] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<Card | 'new' | null>(null)

  const topics = useMemo(
    () => [...new Map(data.cards.map((c) => [c.topic, c.topicTitle])).entries()],
    [data.cards],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.cards
      .filter((c) => {
        if (topic && c.topic !== topic) return false
        if (sources.length && !sources.includes(c.source)) return false
        if (state === 'suspended' ? !c.suspended : state && c.srs.state !== state) return false
        if (needle) {
          const haystack = `${c.question} ${c.answer} ${c.tags.join(' ')}`.toLowerCase()
          if (!haystack.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => a.topic.localeCompare(b.topic) || a.id.localeCompare(b.id))
  }, [data.cards, query, topic, sources, state])

  const toggleSource = (s: Source) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  return (
    <>
      <div className="row between">
        <h1>Карточки</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + Новая карточка
        </button>
      </div>
      <p className="subtitle">
        Всего {data.cards.length}, показано {filtered.length}. Цвет полосы слева — источник карточки.
      </p>

      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по вопросу, ответу, тегам…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            const next = new URLSearchParams(params)
            e.target.value ? next.set('q', e.target.value) : next.delete('q')
            setParams(next, { replace: true })
          }}
        />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">Все темы</option>
          {topics.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Любое состояние</option>
          <option value="new">Новые</option>
          <option value="learning">Учатся</option>
          <option value="review">На повторении</option>
          <option value="relearning">Забытые</option>
          <option value="suspended">Отложенные</option>
        </select>
        {SOURCES.map((s) => (
          <button
            key={s.id}
            className={`chip ${sources.includes(s.id) ? 'on' : ''}`}
            data-source={s.id}
            onClick={() => toggleSource(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>Ничего не найдено</h3>
          <p>Смягчи фильтры или добавь карточку.</p>
        </div>
      ) : (
        filtered.map((card) => (
          <div
            className={`list-item ${card.suspended ? 'suspended' : ''}`}
            data-source={card.source}
            key={card.id}
          >
            <div
              className="list-head"
              onClick={() => setOpen((id) => (id === card.id ? null : card.id))}
            >
              <span className={`state-dot ${card.srs.state}`} title={STATE_LABEL[card.srs.state]} />
              <div className="list-q">
                <div className="truncate">{plainTitle(card.question)}</div>
              </div>
              <span className="pill ghost">{card.topicTitle}</span>
              {card.srs.state === 'review' && (
                <span className="pill ghost">{card.srs.interval} д</span>
              )}
              <span className="pill ghost">{open === card.id ? '−' : '+'}</span>
            </div>

            {open === card.id && (
              <div className="list-body">
                <Markdown text={card.question} className="question" />
                <div className="answer">
                  <Markdown text={card.answer} />
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn sm" onClick={() => setEditing(card)}>
                    Редактировать
                  </button>
                  <button
                    className="btn sm"
                    onClick={async () => {
                      await api.suspend(card.id)
                      await data.reload()
                    }}
                  >
                    {card.suspended ? 'Вернуть в оборот' : 'Отложить'}
                  </button>
                  <button
                    className="btn sm"
                    onClick={async () => {
                      await api.resetCard(card.id)
                      data.toast('Прогресс сброшен')
                      await data.reload()
                    }}
                  >
                    Сбросить прогресс
                  </button>
                  <span className="spacer" />
                  <span className="hint">
                    повторов {card.srs.reps} · забыто {card.srs.lapses} · лёгкость{' '}
                    {card.srs.ease.toFixed(2)}
                    {card.srs.due && ` · след. ${new Date(card.srs.due).toLocaleDateString('ru')}`}
                  </span>
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!confirm('Удалить карточку безвозвратно?')) return
                      await api.deleteCard(card.id)
                      data.toast('Карточка удалена')
                      await data.reload()
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {editing && (
        <CardEditor
          card={editing === 'new' ? null : editing}
          topics={topics}
          onClose={() => setEditing(null)}
          onSaved={async (text) => {
            setEditing(null)
            data.toast(text)
            await data.reload()
          }}
        />
      )}
    </>
  )
}
