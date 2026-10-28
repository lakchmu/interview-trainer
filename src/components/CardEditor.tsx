import { useEffect, useState } from 'react'
import { api } from '../api'
import { Markdown } from './Markdown'
import type { Card, Level } from '../types'

interface Props {
  card: Card | null
  topics: [string, string][]
  /** Заготовка для новой карточки — используется при импорте секции конспекта. */
  draft?: { question: string; answer: string; sourceFile?: string; source?: 'notes' | 'manual' }
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}

export function CardEditor({ card, topics, draft, onClose, onSaved }: Props) {
  const [question, setQuestion] = useState(card?.question ?? draft?.question ?? '')
  const [answer, setAnswer] = useState(card?.answer ?? draft?.answer ?? '')
  const [topic, setTopic] = useState(card?.topic ?? (draft?.source === 'notes' ? 'notes' : 'custom'))
  const [tags, setTags] = useState((card?.tags ?? []).join(', '))
  const [level, setLevel] = useState<Level>(card?.level ?? 'middle')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const knownTitle = topics.find(([id]) => id === topic)?.[1]

  async function save() {
    if (!question.trim() || !answer.trim()) {
      setError('Нужны и вопрос, и ответ')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        question,
        answer,
        topic,
        topicTitle: knownTitle ?? (topic === 'notes' ? 'Мои конспекты' : 'Мои карточки'),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        level,
        source: draft?.source ?? 'manual',
        sourceFile: draft?.sourceFile ?? null,
      }
      if (card) await api.updateCard(card.id, payload)
      else await api.createCard(payload)
      await onSaved(card ? 'Карточка обновлена' : 'Карточка добавлена')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{card ? 'Редактирование карточки' : 'Новая карточка'}</h3>

        <div className="row" style={{ marginBottom: 14 }}>
          <button className={`chip ${tab === 'edit' ? 'on' : ''}`} onClick={() => setTab('edit')}>
            Редактор
          </button>
          <button
            className={`chip ${tab === 'preview' ? 'on' : ''}`}
            onClick={() => setTab('preview')}
          >
            Предпросмотр
          </button>
          <span className="spacer" />
          <span className="hint">поддерживается markdown и ```-блоки кода</span>
        </div>

        {tab === 'edit' ? (
          <>
            <div className="field">
              <label>Вопрос</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ minHeight: 70 }}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Ответ</label>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ minHeight: 200 }} />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label>Тема</label>
                <input
                  type="text"
                  list="topic-options"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <datalist id="topic-options">
                  {topics.map(([id, title]) => (
                    <option key={id} value={id}>
                      {title}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Теги (через запятую)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="field" style={{ width: 130 }}>
                <label>Уровень</label>
                <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                  <option value="junior">junior</option>
                  <option value="middle">middle</option>
                  <option value="senior">senior</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="flashcard" data-source={card?.source ?? draft?.source ?? 'manual'}>
            <Markdown text={question} className="question" />
            <div className="answer">
              <Markdown text={answer} />
            </div>
          </div>
        )}

        {error && <p className="hint" style={{ color: 'var(--bad)' }}>{error}</p>}

        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={() => void save()} disabled={saving}>
            Сохранить <span className="kbd">⌘↵</span>
          </button>
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
