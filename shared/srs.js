/**
 * SM-2 with the Anki-style tweaks that matter in practice:
 * learning steps for new cards, a relearning step after a lapse, and a small
 * random fuzz on long intervals so a big import doesn't come back all at once.
 *
 * grade: 0 = снова, 1 = трудно, 2 = хорошо, 3 = легко
 */

const DAY = 86400000
const LEARN_STEPS_MIN = [1, 10] // новые: 1 мин -> 10 мин -> в оборот
const RELEARN_STEP_MIN = 10

function fuzz(days) {
  if (days < 3) return days
  const spread = Math.max(1, Math.round(days * 0.05))
  return days + Math.round((Math.random() * 2 - 1) * spread)
}

export function review(srs, grade, now = Date.now()) {
  const s = { ...srs }
  s.lastReview = new Date(now).toISOString()
  s.reps = (s.reps ?? 0) + 1

  if (s.state === 'new' || s.state === 'learning') {
    s.state = 'learning'
    if (grade === 0) {
      s.step = 0
    } else if (grade === 3) {
      // «легко» на обучении — сразу выпускаем с интервалом 4 дня
      s.state = 'review'
      s.interval = 4
      s.due = new Date(now + fuzz(s.interval) * DAY).toISOString()
      return s
    } else {
      s.step = (s.step ?? 0) + 1
    }

    if (s.step >= LEARN_STEPS_MIN.length) {
      s.state = 'review'
      s.interval = grade === 1 ? 1 : 2
      s.due = new Date(now + s.interval * DAY).toISOString()
      delete s.step
    } else {
      s.due = new Date(now + LEARN_STEPS_MIN[s.step] * 60000).toISOString()
    }
    return s
  }

  if (s.state === 'relearning') {
    if (grade === 0) {
      s.due = new Date(now + RELEARN_STEP_MIN * 60000).toISOString()
    } else {
      s.state = 'review'
      s.interval = Math.max(1, Math.round(s.interval || 1))
      s.due = new Date(now + fuzz(s.interval) * DAY).toISOString()
    }
    return s
  }

  // state === 'review'
  if (grade === 0) {
    s.lapses = (s.lapses ?? 0) + 1
    s.ease = Math.max(1.3, s.ease - 0.2)
    s.interval = Math.max(1, Math.round(s.interval * 0.5))
    s.state = 'relearning'
    s.due = new Date(now + RELEARN_STEP_MIN * 60000).toISOString()
    return s
  }

  const easeDelta = { 1: -0.15, 2: 0, 3: 0.15 }[grade] ?? 0
  s.ease = Math.min(3.0, Math.max(1.3, s.ease + easeDelta))
  const mult = { 1: 1.2, 2: s.ease, 3: s.ease * 1.3 }[grade]
  s.interval = Math.max(1, Math.round((s.interval || 1) * mult))
  s.due = new Date(now + fuzz(s.interval) * DAY).toISOString()
  return s
}

/** Прогноз интервала для подписи на кнопке — без мутации и без fuzz. */
export function preview(srs, grade) {
  const next = review({ ...srs }, grade, Date.now())
  const ms = new Date(next.due).getTime() - Date.now()
  const min = Math.round(ms / 60000)
  if (min < 60) return `${Math.max(1, min)} мин`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} ч`
  const days = Math.round(ms / 86400000)
  if (days < 31) return `${days} д`
  const months = (days / 30.4).toFixed(days < 365 ? 1 : 0)
  if (days < 365) return `${months} мес`
  return `${(days / 365).toFixed(1)} г`
}
