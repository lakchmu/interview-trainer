import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IGNORED = new Set(['node_modules', '.git', '.obsidian', '.trash', 'dist', 'build', '.next'])

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Конспекты, лежащие внутри приложения. Это основной источник: раньше путь вёл
 * в чужую папку (iCloud/Obsidian), и приложение зависело от того, на месте ли
 * она и синхронизировалась ли. Теперь материалы едут вместе с ним.
 *
 * Пишет в них только правка карточки из интерфейса (writeCard) — по одной карточке
 * и по явному действию; ничего не переписывается само по себе.
 */
export const BUNDLED_NOTES = path.resolve(__dirname, '..', 'data', 'notes')

/** Есть ли внешняя папка. Пустая настройка означает «взять встроенные». */
export function isBundled(dir) {
  return !dir || resolveDir(dir) === BUNDLED_NOTES
}

/** Разворачивает ~ и относительные пути в абсолютный. */
export function resolveDir(dir) {
  // Пусто — берём встроенные: приложение должно работать без всякой настройки.
  if (!dir) return fs.existsSync(BUNDLED_NOTES) ? BUNDLED_NOTES : ''
  const expanded = dir.startsWith('~') ? path.join(process.env.HOME ?? '', dir.slice(1)) : dir
  return path.resolve(expanded)
}

/** Путь безопасен, только если он реально лежит внутри базовой папки. */
export function insideDir(base, target) {
  const rel = path.relative(base, target)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function scanNotes(rawDir) {
  const dir = resolveDir(rawDir)
  if (!dir || !fs.existsSync(dir)) return { dir, ok: false, files: [] }

  const files = []
  const walk = (current, depth) => {
    if (depth > 8) return
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED.has(entry.name)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full, depth + 1)
      } else if (entry.isFile() && /\.(md|markdown|mdx)$/i.test(entry.name)) {
        const stat = fs.statSync(full)
        const rel = path.relative(dir, full)
        files.push({
          rel,
          folder: path.dirname(rel) === '.' ? '' : path.dirname(rel),
          name: entry.name.replace(/\.(md|markdown|mdx)$/i, ''),
          title: firstHeading(full) ?? entry.name.replace(/\.(md|markdown|mdx)$/i, ''),
          size: stat.size,
          mtime: stat.mtimeMs,
        })
      }
    }
  }
  walk(dir, 0)
  // numeric: иначе «10. HTML» встаёт между первым и вторым файлом
  files.sort((a, b) => a.rel.localeCompare(b.rel, 'ru', { numeric: true }))
  return { dir, ok: true, files }
}

function firstHeading(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 4000)
    // Строки внутри блоков кода не в счёт: комментарий «# Фича» в примере с
    // командами git иначе становился названием всего конспекта.
    let fence = false
    for (const line of head.split('\n')) {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence
      if (fence) continue
      const match = line.match(/^#\s+(.+)$/)
      if (match) return match[1].trim()
    }
    return null
  } catch {
    return null
  }
}

export function readNote(rawDir, rel) {
  const dir = resolveDir(rawDir)
  const full = path.resolve(dir, rel)
  if (!dir || !insideDir(dir, full)) throw new Error('Путь вне папки заметок')
  if (!fs.existsSync(full)) throw new Error('Файл не найден')
  const content = fs.readFileSync(full, 'utf8')
  return { rel, content, sections: splitSections(content) }
}

/**
 * Режет заметку по заголовкам 2-3 уровня — это готовые кандидаты в карточки:
 * заголовок становится вопросом, тело — ответом.
 */
export function splitSections(content) {
  const lines = content.split('\n')
  const sections = []
  let current = null
  let inFence = false

  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    const heading = !inFence && line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      if (current) sections.push(current)
      current = { level: heading[1].length, title: heading[2].trim(), line: i + 1, body: [] }
    } else if (current) {
      current.body.push(line)
    }
  })
  if (current) sections.push(current)

  return sections
    .map((s, i) => ({ ...s, index: i, body: s.body.join('\n').trim() }))
    .filter((s) => s.body.length > 0)
}

/**
 * Настоящие единицы материала — заголовки вида «## 3. …».
 *
 * splitSections режет по всем заголовкам подряд, и подпунктов выходит на
 * порядок больше (564 против 58). Считать прогресс и платить за них нельзя:
 * счётчик становится безнадёжным на вид, а оплата — прокликиваемой.
 * Файл без нумерации откатывается на все разделы, чтобы не остаться без единиц.
 */
export function unitSections(sections) {
  const numbered = sections.filter((s) => s.level === 2 && /^\d+\./.test(s.title))
  return numbered.length > 0 ? numbered : sections
}

/**
 * Режет заметку на карточки — единицы чтения размером примерно с экран.
 *
 * Границей служит любой заголовок и любой самостоятельный callout: «как звучало
 * на собеседовании», «коротко», «подводные камни» — это законченные куски,
 * которые незачем склеивать с соседним текстом. По одним заголовкам выходило
 * заметно хуже: каждая шестая карточка не помещалась на экран, с callout'ами —
 * каждая четырнадцатая.
 *
 * Поле group — номер раздела «## N.», внутри которого лежит карточка; по нему
 * карточки группируются и подбирается проверка после раздела.
 */
export function splitCards(content) {
  const lines = content.split('\n')
  const cards = []
  let cur = null
  let group = null
  let fence = false

  // from/to — точный диапазон строк файла, который занимает карточка. Он нужен,
  // чтобы правку из редактора можно было вставить обратно ровно на её место,
  // не трогая ни одной соседней строки.
  const push = (to) => {
    if (!cur) return
    const body = cur.body.join('\n').trim()
    if (body) cards.push({ ...cur, body, to })
    cur = null
  }

  const start = (title, level, kind, at) => {
    push(at)
    cur = { title, level, kind, group, from: at, body: [] }
  }

  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence

    const heading = fence ? null : line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].trim()
      // «## 3. …» открывает новый раздел, всё до следующего такого — его карточки
      const numbered = level === 2 && /^(\d+)\./.exec(title)
      if (numbered) {
        // Заголовок раздела — шапка группы, а не карточка: сам по себе он пуст.
        push(i)
        group = Number(numbered[1])
        return
      }
      if (level <= 2) group = null
      start(title, level, 'heading', i)
      cur.body.push(line)
      return
    }

    const callout = fence ? null : line.match(/^>\s*\[!(\w+)\][-+]?\s*(.*)$/)
    if (callout) {
      const label = callout[2].replace(/\*/g, '').replace(/:\s*$/, '').trim()
      start(label || callout[1], null, callout[1].toLowerCase(), i)
      cur.body.push(line)
      return
    }

    if (!cur) cur = { title: '', level: null, kind: 'text', group, from: i, body: [] }
    cur.body.push(line)
  })
  push(lines.length)

  // Заголовок без собственного текста — не карточка, а подпись к следующей.
  const merged = []
  for (const card of cards) {
    const prev = merged.length ? merged[merged.length - 1] : null
    const prevBare = prev && prev.kind === 'heading' && prev.body.split('\n').length === 1
    if (prevBare) {
      prev.body = `${prev.body}\n\n${card.body}`
      prev.to = card.to
      if (card.kind !== 'heading') prev.kind = card.kind
      continue
    }
    merged.push({ ...card })
  }

  return merged.map((c, i) => ({ ...c, index: i }))
}

/**
 * Замена одной карточки в файле конспекта.
 *
 * Это единственное место, где приложение ПИШЕТ в конспекты. Правила простые:
 * вставка идёт ровно в строки карточки, весь остальной файл побайтово тот же;
 * перед заменой сверяется, что карточка на месте не изменилась (иначе файл
 * правили снаружи, и молча затирать чужую правку нельзя); запись атомарная —
 * во временный файл с подменой, чтобы обрыв не оставил обрубок конспекта.
 */
export function writeCard(rawDir, rel, index, body, original) {
  const dir = resolveDir(rawDir)
  const full = path.resolve(dir, rel)
  if (!dir || !insideDir(dir, full)) throw new Error('Путь вне папки заметок')
  if (!fs.existsSync(full)) throw new Error('Файл не найден')

  const content = fs.readFileSync(full, 'utf8')
  const cards = splitCards(content)
  const card = cards[index]
  if (!card) throw new Error('Карточки с таким номером нет')

  if (typeof original === 'string' && original.trim() !== card.body.trim()) {
    throw new Error('Файл изменился с момента открытия — обнови страницу')
  }

  const next = String(body ?? '').replace(/\s+$/, '')
  if (!next.trim()) throw new Error('Пустая карточка: удалять текст так нельзя')

  const lines = content.split('\n')
  // Диапазон карточки захватывает и пустые строки-разделители по краям, а тело
  // отдаётся обрезанным. Пишем только в строки самого текста, иначе каждое
  // сохранение подъедало бы по пустой строке и файл медленно слипался бы.
  let from = card.from
  let to = card.to
  while (from < to && lines[from].trim() === '') from += 1
  while (to > from && lines[to - 1].trim() === '') to -= 1

  const updated = [...lines.slice(0, from), ...next.split('\n'), ...lines.slice(to)].join('\n')

  const tmp = `${full}.tmp`
  fs.writeFileSync(tmp, updated)
  fs.renameSync(tmp, full)

  return { content: updated, cards: splitCards(updated) }
}

/** Полнотекстовый поиск по всем заметкам — с контекстом вокруг совпадения. */
export function searchNotes(rawDir, query, limit = 60) {
  const dir = resolveDir(rawDir)
  if (!dir || !query || query.trim().length < 2) return []
  const needle = query.trim().toLowerCase()
  const { files } = scanNotes(rawDir)
  const hits = []

  for (const file of files) {
    let content
    try {
      content = fs.readFileSync(path.join(dir, file.rel), 'utf8')
    } catch {
      continue
    }
    const lower = content.toLowerCase()
    let from = 0
    let count = 0
    while (count < 3) {
      const at = lower.indexOf(needle, from)
      if (at === -1) break
      hits.push({
        rel: file.rel,
        title: file.title,
        line: content.slice(0, at).split('\n').length,
        excerpt: content.slice(Math.max(0, at - 90), at + needle.length + 110).replace(/\s+/g, ' ').trim(),
      })
      from = at + needle.length
      count += 1
      if (hits.length >= limit) return hits
    }
  }
  return hits
}
