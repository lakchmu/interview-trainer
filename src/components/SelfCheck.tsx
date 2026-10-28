import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Markdown } from './Markdown'
import type { NoteCard } from '../types'

/**
 * Самопроверка по карточкам конспекта: страница размывается, остаётся вопрос.
 * Ответ открывается только кнопкой — сначала вспомнить вслух, потом сверить.
 *
 * Идёт по карточкам раздела подряд, начиная с той, где нажали кнопку: одна
 * проверка тянет следующую, как в «Повторении», только без интервалов.
 * Вопросы пишутся заранее (data/selfcheck); у карточки без вопроса спрашивается
 * её заголовок, а ответом служит сама карточка.
 *
 * «Не вспомнила» сразу отправляет карточку в интервальное повторение: без этого
 * невспомненное легко потерять, а с этим — оно само вернётся в «Повторении».
 */

export type CheckResults = Record<string, { ok: boolean; ts: number }>

const RESULTS_KEY = 'notes.selfcheck'

/** Итоги хранятся в браузере: это подсказка «что повторить», а не прогресс. */
export function loadCheckResults(): CheckResults {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}') as CheckResults
  } catch {
    return {}
  }
}

function saveCheckResults(results: CheckResults) {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results))
  } catch {
    // хранилище недоступно — итог просто не запомнится
  }
}

export const checkKey = (rel: string, card: NoteCard) => `${rel}#${card.group}|${card.title}`

/** Карточки, по которым есть смысл спрашивать: учебные, внутри раздела. */
export const checkable = (card: NoteCard) => card.group != null && card.kind !== 'abstract'

/** Тело карточки без служебной строки callout'а — как в самой карточке. */
export function cardBody(card: NoteCard) {
  const isCallout = card.kind !== 'heading' && card.kind !== 'text'
  return isCallout ? card.body.split('\n').slice(1).join('\n') : card.body
}

function questionOf(card: NoteCard, siblings: NoteCard[], section: string) {
  if (card.check) return { q: card.check.q, a: card.check.a }
  if (card.kind === 'quote') {
    // Реплика интервьюера — готовый вопрос; ответ — «Коротко» того же раздела
    const short = siblings.find((c) => c.kind === 'tip')
    return {
      q: `Ответь вслух, как на собеседовании:\n\n${cardBody(card)}`,
      a: short ? cardBody(short) : 'Сверь с карточками раздела.',
    }
  }
  const topic = card.title?.trim() || section
  return { q: `**${topic}**\n\nВспомни и проговори вслух, что здесь главное.`, a: cardBody(card) }
}

export function SelfCheck({
  rel,
  section,
  cards,
  start,
  results,
  onResult,
  onSent,
  onClose,
}: {
  rel: string
  /** Заголовок раздела — для подписи и для карточек без заголовка. */
  section: string
  /** Карточки раздела по порядку. */
  cards: NoteCard[]
  /** С какой карточки начать (её index). */
  start: number
  results: CheckResults
  onResult: (next: CheckResults) => void
  /** Карточка ушла в повторение — приложению пора перечитать список карточек. */
  onSent?: () => void
  onClose: () => void
}) {
  const list = cards.filter(checkable)
  const [pos, setPos] = useState(() => Math.max(0, list.findIndex((c) => c.index === start)))
  const [revealed, setRevealed] = useState(false)
  const [showCard, setShowCard] = useState(false)
  /** Оценки этого захода: по ним итог в конце. */
  const [session, setSession] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)
  /** Что ушло в повторение за этот заход и что отправить не удалось. */
  const [sent, setSent] = useState(0)
  const [failed, setFailed] = useState(0)
  const mainButton = useRef<HTMLButtonElement>(null)

  const card = list[pos]
  const { q, a } = card ? questionOf(card, list, section) : { q: '', a: '' }

  const go = useCallback(
    (next: number) => {
      if (next >= list.length) {
        setFinished(true)
        return
      }
      setPos(Math.max(0, next))
      setRevealed(false)
      setShowCard(false)
    },
    [list.length],
  )

  const grade = useCallback(
    (ok: boolean) => {
      const next = { ...results, [checkKey(rel, card)]: { ok, ts: Date.now() } }
      saveCheckResults(next)
      onResult(next)
      setSession((s) => ({ ...s, [card.index]: ok }))
      if (!ok && card.group != null) {
        // Не ждём ответа сервера: проверка идёт дальше, итог — в конце раздела
        api
          .selfCheckMiss(rel, card.group, card.title ?? '')
          .then(() => {
            setSent((n) => n + 1)
            onSent?.()
          })
          .catch(() => setFailed((n) => n + 1))
      }
      go(pos + 1)
    },
    [results, rel, card, onResult, onSent, go, pos],
  )

  // Страница под окном не прокручивается, пока идёт проверка
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    mainButton.current?.focus()
  }, [pos, revealed, finished])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (finished) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && e.key === '1') grade(false)
      else if (revealed && e.key === '2') grade(true)
      else if (e.key === 'ArrowRight') go(pos + 1)
      else if (e.key === 'ArrowLeft') go(pos - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, revealed, grade, go, pos, onClose])

  const graded = Object.values(session)
  const recalled = graded.filter(Boolean).length
  const missed = list.filter((c) => session[c.index] === false)

  const restartMissed = () => {
    if (!missed.length) return
    setPos(list.indexOf(missed[0]))
    setSession({})
    setFinished(false)
    setRevealed(false)
    setShowCard(false)
  }

  return createPortal(
    <div
      className="selfcheck-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Самопроверка"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="selfcheck">
        <header className="selfcheck-head">
          <span className="selfcheck-section">Самопроверка · {section}</span>
          {!finished && (
            <span className="selfcheck-count">
              {pos + 1} из {list.length}
            </span>
          )}
          <button className="selfcheck-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        {finished ? (
          <div className="selfcheck-done">
            <h3>
              {graded.length === 0
                ? 'Раздел пройден'
                : `Вспомнила ${recalled} из ${graded.length}`}
            </h3>
            {(sent > 0 || failed > 0) && (
              <p className="hint">
                {sent > 0 && (
                  <>
                    {sent} {sent === 1 ? 'карточка ушла' : sent < 5 ? 'карточки ушли' : 'карточек ушло'} в{' '}
                    <Link to="/review" onClick={onClose}>
                      «Повторение»
                    </Link>{' '}
                    — {sent === 1 ? 'она вернётся' : 'они вернутся'} сегодня же.{' '}
                  </>
                )}
                {failed > 0 && `Не удалось отправить: ${failed}.`}
              </p>
            )}
            {missed.length > 0 && (
              <>
                <p className="hint">Не вспомнилось:</p>
                <ul>
                  {missed.map((c) => (
                    <li key={c.index}>{c.title || section}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="row">
              {missed.length > 0 && (
                <button ref={mainButton} className="btn primary" onClick={restartMissed}>
                  Ещё раз невспомненные · {missed.length}
                </button>
              )}
              <button ref={missed.length ? undefined : mainButton} className="btn" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="selfcheck-question">
              <Markdown text={q} />
            </div>

            {!revealed ? (
              <div className="selfcheck-actions">
                <button ref={mainButton} className="btn primary" onClick={() => setRevealed(true)}>
                  Показать ответ
                </button>
                <span className="hint">
                  Сначала ответь вслух · <span className="kbd">Пробел</span> · невспомненное уйдёт в «Повторение»
                </span>
              </div>
            ) : (
              <>
                <div className="selfcheck-answer">
                  <div className="selfcheck-label">Ответ</div>
                  <Markdown text={a} />
                  {card.check && (
                    <button className="btn ghost sm" onClick={() => setShowCard((v) => !v)}>
                      {showCard ? 'Скрыть карточку' : 'Карточка целиком'}
                    </button>
                  )}
                  {showCard && (
                    <div className="selfcheck-card">
                      <Markdown text={cardBody(card)} />
                    </div>
                  )}
                </div>
                <div className="selfcheck-actions">
                  <button className="btn" onClick={() => grade(false)} title="Карточка уйдёт в «Повторение»">
                    Не вспомнила <span className="kbd">1</span>
                  </button>
                  <button ref={mainButton} className="btn primary" onClick={() => grade(true)}>
                    Вспомнила <span className="kbd">2</span>
                  </button>
                </div>
              </>
            )}

            <footer className="selfcheck-nav">
              <button className="btn ghost sm" disabled={pos === 0} onClick={() => go(pos - 1)}>
                ← Назад
              </button>
              <span className="hint">
                <span className="kbd">Esc</span> — закрыть
              </span>
              <button className="btn ghost sm" onClick={() => go(pos + 1)}>
                Пропустить →
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
