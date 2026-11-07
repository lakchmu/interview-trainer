/**
 * Вопросы самопроверки к конспекту — через внешний чат.
 *
 *   node scripts/selfcheck-draft.mjs export 2   → tmp/selfcheck-2/: карточки и промпт
 *   node scripts/selfcheck-draft.mjs import 2   → проверяет tmp/selfcheck-2/answers-*.json
 *                                                 и пишет data/selfcheck/2.json
 *
 * Чат отвечает номерами карточек, а не заголовками: заголовок легко переписать
 * с ошибкой, и вопрос молча не привяжется. Раздел и заголовок подставляются
 * здесь, из того же splitCards, которым конспект режет сервер.
 */
import fs from 'node:fs'
import path from 'node:path'
import { BUNDLED_NOTES, splitCards } from '../server/notes.mjs'

const ROOT = path.resolve(BUNDLED_NOTES, '..', '..')
const [command, number, flag] = process.argv.slice(2)
if (!['export', 'import'].includes(command) || !/^\d+$/.test(number ?? '')) {
  console.error('Использование: node scripts/selfcheck-draft.mjs export|import <номер конспекта> [--force]')
  process.exit(1)
}

const rel = fs.readdirSync(BUNDLED_NOTES).find((f) => f.startsWith(`${number}.`) && f.endsWith('.md'))
if (!rel) throw new Error(`Нет конспекта с номером ${number}`)
const content = fs.readFileSync(path.join(BUNDLED_NOTES, rel), 'utf8')
const name = rel.replace(/\.md$/, '').replace(/\s+/g, ' ')
const cards = splitCards(content).filter((c) => c.group != null && c.kind !== 'abstract')
const sections = Object.fromEntries([...content.matchAll(/^## (\d+)\.\s+(.+)$/gm)].map((m) => [m[1], m[2].trim()]))
const work = path.join(ROOT, 'tmp', `selfcheck-${number}`)
const target = path.join(ROOT, 'data', 'selfcheck', `${number}.json`)

if (command === 'export') {
  fs.mkdirSync(work, { recursive: true })
  let md = `# Карточки конспекта «${name}»\n\nВсего карточек: ${cards.length}.\n`
  let group = null
  for (const c of cards) {
    if (c.group !== group) {
      group = c.group
      md += `\n\n## Раздел ${group}. ${sections[group] ?? ''}\n`
    }
    md += `\n\n### Карточка ${c.index} · ${c.kind} · ${c.title || 'без заголовка'}\n\n${c.body.trim()}\n`
  }
  fs.writeFileSync(path.join(work, 'cards.md'), md)
  fs.writeFileSync(path.join(work, 'prompt.md'), prompt())
  console.log(`Готово: ${path.relative(ROOT, work)}/cards.md (${cards.length} карточек) и prompt.md`)
} else {
  const files = fs.existsSync(work) ? fs.readdirSync(work).filter((f) => /^answers.*\.json$/.test(f)).sort() : []
  if (!files.length) throw new Error(`В ${path.relative(ROOT, work)} нет файлов answers-*.json`)
  const byIndex = new Map(cards.map((c) => [c.index, c]))
  const got = new Map()
  const problems = []
  for (const f of files) {
    let data
    try {
      data = JSON.parse(fs.readFileSync(path.join(work, f), 'utf8'))
    } catch (err) {
      problems.push(`${f}: не JSON — ${err.message}`)
      continue
    }
    for (const item of data.checks ?? data) {
      const card = byIndex.get(item.index)
      if (!card) problems.push(`${f}: карточки ${item.index} нет`)
      else if (got.has(item.index)) problems.push(`${f}: карточка ${item.index} повторяется`)
      else if (typeof item.q !== 'string' || !item.q.trim() || typeof item.a !== 'string' || !item.a.trim())
        problems.push(`${f}: у карточки ${item.index} пустой вопрос или ответ`)
      else got.set(item.index, item)
    }
  }
  const missing = cards.filter((c) => !got.has(c.index)).map((c) => c.index)
  if (missing.length) problems.push(`без вопроса: ${missing.join(', ')}`)
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
  if (fs.existsSync(target) && flag !== '--force') throw new Error(`${path.relative(ROOT, target)} уже есть — перезапись только с --force`)
  const checks = cards.map((c) => ({ group: c.group, title: c.title, q: got.get(c.index).q.trim(), a: got.get(c.index).a.trim() }))
  const note = `Вопросы самопроверки к «${name}». Карточка находится по group и title.`
  fs.writeFileSync(target, JSON.stringify({ file: Number(number), note, checks }, null, 2) + '\n')
  console.log(`Записано ${checks.length} вопросов в ${path.relative(ROOT, target)}`)
}

function prompt() {
  const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'selfcheck', '1.json'), 'utf8')).checks
  const pick = [
    sample.find((c) => c.title.startsWith('Как звучало')),
    sample.find((c) => c.title.startsWith('Коротко')),
    sample.find((c) => !/^(Как звучало|Коротко|Подводные)/.test(c.title)),
    sample.find((c) => c.title.startsWith('Подводные')),
  ].filter(Boolean)
  const examples = pick.map((c) => `Карточка «${c.title}»:\n\n\`\`\`json\n${JSON.stringify({ q: c.q, a: c.a }, null, 2)}\n\`\`\``).join('\n\n')
  // Части по границам разделов, не больше ~40 карточек: длинный ответ чат обрезает
  const size = (g) => cards.filter((c) => c.group === g).length
  const batches = []
  for (const g of new Set(cards.map((c) => c.group))) {
    const last = batches.at(-1)
    if (last && last.reduce((n, x) => n + size(x), 0) + size(g) <= 40) last.push(g)
    else batches.push([g])
  }
  const batchList = batches
    .map((b, i) => {
      const n = b.reduce((sum, g) => sum + size(g), 0)
      const range = b.length > 1 ? `Разделы ${b[0]}–${b.at(-1)}` : `Раздел ${b[0]}`
      return `${i + 1}. ${range} — карточек: ${n} → \`answers-${i + 1}.json\``
    })
    .join('\n')
  return `Ты помогаешь сделать вопросы для самопроверки к конспекту для подготовки к собеседованию Senior Frontend.

К сообщению приложен файл cards.md: конспект «${name}», разбитый на ${cards.length} карточек. У каждой карточки есть номер («Карточка 12»), тип и заголовок.

## Задача

Для КАЖДОЙ карточки напиши один вопрос (q) и ответ (a). Человек читает вопрос, отвечает вслух по памяти, потом открывает ответ и сверяется.

## Правила

- Ответ строится только на содержании своей карточки. Не добавляй фактов, которых в карточке нет, и не исправляй карточку. Если в карточке, по-твоему, ошибка — не меняй ответ, а перечисли номер и суть в конце отдельным списком.
- Вопрос проверяет понимание, а не пересказ: «почему», «чем отличается», «что выведет этот код», «что сломается, если…». Где в карточке есть код — дай в вопросе короткий фрагмент и спроси результат или ошибку.
- По типу карточки:
  - quote («Как звучало на собеседовании») — вопрос в форме реплики интервьюера: «Интервьюер: «…» Ответь коротко.»; ответ — как сказать это вслух за 30–60 секунд.
  - tip («Коротко») — короткая задача или сравнение по главной мысли раздела.
  - warning («Подводные камни») — «Верно или нет?» и 3–5 типичных заблуждений из карточки, в ответе — разбор по номерам.
  - heading — конкретный вопрос по этой карточке.
- Ответ короткий: обычно 150–450 знаков, максимум около 600. Markdown: **жирный** для ключевого, списки, таблицы, блоки кода с языком (\`\`\`js). Без вступлений вроде «Отличный вопрос».
- Русский язык, кавычки «ёлочки», тире «—». Названия API, методов и ключевые слова — как в коде: \`Array.prototype.sort\`, \`NaN\`.

## Образец стиля — из готового раздела про HTTP

${examples}

## Формат ответа

Карточек много, поэтому отвечай частями — по одной за сообщение. Каждая часть — один JSON-файл для скачивания (если файл сделать нельзя — один блок \`\`\`json без текста вокруг):

${batchList}

Формат файла:

\`\`\`json
{ "checks": [ { "index": 2, "q": "…", "a": "…" } ] }
\`\`\`

\`index\` — номер карточки из cards.md. Заголовок и раздел не нужны. В каждой части должны быть все карточки её разделов, без пропусков. Начни с части 1; следующую пиши, когда я напишу «дальше».
`
}
