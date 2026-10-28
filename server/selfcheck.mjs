import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './db.mjs'

/**
 * Вопросы для самопроверки по карточкам конспекта.
 *
 * Лежат отдельно от конспекта — data/selfcheck/<номер файла>.json, — потому что
 * конспект пишется в Obsidian и вопросы в нём были бы лишним шумом. К карточке
 * вопрос привязан по разделу и заголовку, а не по номеру: номера сдвигаются,
 * стоит добавить в конспект одну карточку. Файл читается на каждый запрос —
 * новые вопросы видны без перезапуска.
 */
const DIR = path.join(ROOT, 'data', 'selfcheck')

const clean = (title) => (title ?? '').replace(/^💡\s*/u, '').trim()
const key = (group, title) => `${group}|${clean(title)}`

/** Чем помечена карточка повторения, созданная из самопроверки, — чтобы не плодить дубли. */
export const missKey = (rel, group, title) => `${rel}#${key(group, title)}`

/**
 * В какую колоду класть невспомненное: в ту, что сделана из этого же конспекта.
 * Так карточка остаётся рядом со своей темой в фильтрах и в программе.
 */
const DECK_OF_FILE = {
  1: 'kb-http',
  2: 'kb-javascript',
  3: 'kb-react',
  4: 'kb-typescript',
  5: 'kb-architecture',
  6: 'kb-browser',
  7: 'kb-livecoding',
  8: 'kb-process',
  9: 'vue',
  10: 'markup',
  11: 'tools',
  12: 'js-extra',
  13: 'js-extra',
}
export function deckOfFile(rel) {
  const number = Number(/^(\d+)\./.exec(path.basename(rel))?.[1])
  return DECK_OF_FILE[number] ?? 'notes'
}

/** Вопрос и ответ для повторения: написанный вопрос, иначе заголовок и сама карточка. */
export function missQuestion(card, sectionTitle) {
  const isCallout = card.kind !== 'heading' && card.kind !== 'text'
  const body = isCallout ? card.body.split('\n').slice(1).join('\n') : card.body
  if (card.check) return { question: card.check.q, answer: card.check.a }
  return { question: clean(card.title) || sectionTitle || 'Карточка конспекта', answer: body.trim() }
}

export function withChecks(rel, cards) {
  const number = /^(\d+)\./.exec(path.basename(rel))?.[1]
  if (!number) return cards
  let checks
  try {
    checks = JSON.parse(fs.readFileSync(path.join(DIR, `${number}.json`), 'utf8')).checks ?? []
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[selfcheck] не читается ${number}.json: ${err.message}`)
    return cards
  }
  const byKey = new Map(checks.map((c) => [key(c.group, c.title), c]))
  return cards.map((card) => {
    const check = byKey.get(key(card.group, card.title))
    return check ? { ...card, check: { q: check.q, a: check.a } } : card
  })
}
