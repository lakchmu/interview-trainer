import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { Markdown } from './Markdown'
import type { AppData } from '../App'
import type { Grade } from '../types'

const GRADES: { g: Grade; label: string; key: string }[] = [
  { g: 0, label: 'Не вспомнила', key: '1' },
  { g: 1, label: 'С трудом', key: '2' },
  { g: 2, label: 'Вспомнила', key: '3' },
  { g: 3, label: 'Легко', key: '4' },
]

/**
 * Проверка сразу после прочитанного раздела.
 *
 * Смысл не в баллах: прочитать и тут же вспомнить удерживается заметно лучше,
 * чем прочитать дважды. Поэтому карточки идут через обычный разбор — они
 * реально встают в расписание, а не показываются «для галочки».
 */
export function SectionCheck({
  data,
  cardIds,
  onClose,
}: {
  data: AppData
  cardIds: string[]
  onClose: () => void
}) {
  const cards = useMemo(() => {
    const byId = new Map(data.cards.map((c) => [c.id, c]))
    return cardIds.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
  }, [data.cards, cardIds])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [recalled, setRecalled] = useState(0)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const shownAt = useRef(Date.now())

  const card = cards[index]

  const answer = useCallback(
    async (grade: Grade) => {
      if (!card || busy) return
      setBusy(true)
      try {
        const res = await api.review(card.id, grade, Date.now() - shownAt.current)
        data.celebrate(res.reward)
        const hit = grade >= 2 ? recalled + 1 : recalled
        setRecalled(hit)

        if (index + 1 < cards.length) {
          setIndex(index + 1)
          setRevealed(false)
          shownAt.current = Date.now()
        } else {
          const fin = await api.sectionCheck(hit, cards.length)
          data.celebrate(fin.reward)
          setDone(true)
          await data.reload()
        }
      } finally {
        setBusy(false)
      }
    },
    [card, busy, index, cards.length, recalled, data],
  )

  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      if (e.key === ' ') {
        e.preventDefault()
        setRevealed(true)
        return
      }
      const found = GRADES.find((g) => g.key === e.key)
      if (found && revealed) {
        e.preventDefault()
        void answer(found.g)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, revealed, done])

  if (cards.length === 0) return null

  if (done) {
    const all = recalled === cards.length
    return (
      <div className="section-check done">
        <b>
          {all ? 'Раздел удержан целиком' : `Вспомнила ${recalled} из ${cards.length}`}
        </b>
        <p className="hint">
          {all
            ? 'Эти карточки уже в расписании — вернутся, когда начнут забываться.'
            : 'То, что не вспомнилось, вернётся первым. Это не провал: именно так и находят дыры.'}
        </p>
        <button className="btn sm" onClick={onClose}>
          Дальше
        </button>
      </div>
    )
  }

  return (
    <div className="section-check">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="hint">
          Вспомни вслух, потом сверься · {index + 1} из {cards.length}
        </span>
        <button className="btn ghost sm" onClick={onClose}>
          Прервать
        </button>
      </div>
      <div className="progress-track">
        <i style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      <article className="flashcard" data-source={card.source}>
        <Markdown text={card.question} className="question" />

        {revealed ? (
          <div className="answer">
            <Markdown text={card.answer} />
          </div>
        ) : (
          <p className="reveal-hint" style={{ marginBottom: 0 }}>
            <button className="btn sm" onClick={() => setRevealed(true)}>
              Показать ответ
            </button>
          </p>
        )}

        {revealed && (
          <div className="grade-row">
            {GRADES.map(({ g, label, key }) => (
              <button key={g} className="grade" disabled={busy} onClick={() => void answer(g)}>
                <b>{label}</b>
                <span className="kbd">{key}</span>
              </button>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
