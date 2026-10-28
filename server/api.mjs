import fs from 'node:fs'
import { getDb, persist, persistNow, newSrs } from './db.mjs'
import { CATALOG, shopView, buyItem, equipItem, decorOf } from './shop.mjs'
import { review as applyReview } from '../shared/srs.js'
import { scanNotes, readNote, searchNotes, resolveDir, splitCards, writeCard, isBundled } from './notes.mjs'
import { readQuizzes } from './quiz.mjs'
import { award, levelOf, dailyProgress, checkAchievements, ACHIEVEMENTS } from './game.mjs'
import { readProgram, programView, scopeOfCard, cardsOfTopics, hasStep } from './program.mjs'
import { withChecks, missKey, deckOfFile, missQuestion } from './selfcheck.mjs'
import { createRouter } from '../shared/router.js'

/**
 * Все маршруты API. Транспорт подключается снаружи: Express в server/index.mjs,
 * а в демо-сборке — вызов прямо в браузере (src/demo/backend.ts).
 */
export const app = createRouter()

const today = () => new Date().toISOString().slice(0, 10)
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Контекст для достижений, которые зависят от прогресса по всей базе. */
function gameContext(db) {
  const byTopic = new Map()
  for (const card of Object.values(db.cards)) {
    if (!byTopic.has(card.topic)) byTopic.set(card.topic, { total: 0, fresh: 0 })
    const t = byTopic.get(card.topic)
    t.total += 1
    if (card.srs.state === 'new') t.fresh += 1
  }
  const quizTopics = new Set(db.quizAttempts.map((a) => a.topic))
  const collars = CATALOG.filter((i) => i.slot === 'collar')
  return {
    owned: db.shop.owned,
    collarsTotal: collars.length,
    collarsOwned: collars.filter((i) => db.shop.owned[i.id]).length,
    noteFilesTotal: scanNotes(db.config.notesDir).files.length,
    topicsTotal: byTopic.size,
    topicsCleared: [...byTopic.values()].filter((t) => t.fresh === 0).length,
    quizTopicsDone: quizTopics.size,
    quizTopicsTotal: readQuizzes().length,
  }
}

function bumpDaily(db, kind) {
  const key = today()
  db.daily[key] ??= { new: 0, reviews: 0 }
  db.daily[key][kind] += 1
}

// ---------------------------------------------------------------- state

app.get('/api/state', (_req, res) => {
  const db = getDb()
  // scope считается на лету и в базу не пишется: это свойство программы, а не
  // карточки, и при правке списка тем оно должно пересчитаться само.
  const program = readProgram()
  const cards = Object.values(db.cards).map((c) => ({ ...c, scope: scopeOfCard(program, c) }))
  res.json({ config: db.config, cards, daily: db.daily })
})

app.get('/api/config', (_req, res) => res.json(getDb().config))

app.put('/api/config', (req, res) => {
  const db = getDb()
  db.config = { ...db.config, ...req.body }
  persistNow()
  res.json(db.config)
})

// ---------------------------------------------------------------- очередь

/**
 * Очередь на сегодня: сначала просроченное повторение, потом обучение,
 * потом новые в пределах дневного лимита. Порядок внутри групп перемешан,
 * чтобы карточки одной темы не шли пачкой.
 */
app.get('/api/queue', (req, res) => {
  const db = getDb()
  const now = Date.now()
  const topics = String(req.query.topics ?? '').split(',').filter(Boolean)
  const sources = String(req.query.sources ?? '').split(',').filter(Boolean)
  const tags = String(req.query.tags ?? '').split(',').filter(Boolean)
  const doneToday = db.daily[today()] ?? { new: 0, reviews: 0 }

  // Фокус на программе: без явного выбора темы очередь собирается только из
  // того, что относится к списку работодателя. Явный выбор темы фокус снимает —
  // если человек сам попросил React, прятать его незачем.
  const program = readProgram()
  // program — один или несколько пунктов программы через запятую
  const topicIds = String(req.query.program ?? '').split(',').filter(Boolean)
  const drill = program && topicIds.length ? cardsOfTopics(program, topicIds, Object.values(db.cards)) : null
  const only = drill ? new Set(drill.map((c) => c.id)) : null
  const drillOrder = new Map((drill ?? []).map((c, i) => [c.id, i]))
  const focused = !!program && db.config.focus !== false && !only && topics.length === 0 && req.query.scope !== 'all'
  const scopeOf = new Map()
  const scope = (c) => {
    if (!scopeOf.has(c.id)) scopeOf.set(c.id, scopeOfCard(program, c))
    return scopeOf.get(c.id)
  }

  const pool = Object.values(db.cards).filter((c) => {
    if (c.suspended) return false
    if (only && !only.has(c.id)) return false
    if (focused && scope(c) === 'out') return false
    if (topics.length && !topics.includes(c.topic)) return false
    if (sources.length && !sources.includes(c.source)) return false
    if (tags.length && !tags.some((t) => c.tags.includes(t))) return false
    return true
  })

  const dueNow = (c) => c.srs.due && new Date(c.srs.due).getTime() <= now
  const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v)

  const learning = shuffle(pool.filter((c) => c.srs.state === 'learning' || c.srs.state === 'relearning').filter(dueNow))
  const due = shuffle(pool.filter((c) => c.srs.state === 'review' && dueNow(c)))
    .sort((a, b) => new Date(a.srs.due) - new Date(b.srs.due))
  // В фокусе новые берутся сначала из списка работодателя и только потом из
  // соседних тем: дневной лимит должен уходить на то, о чём спросят наверняка.
  const rank = (c) => (focused && scope(c) !== 'core' ? 1 : 0)
  // Прицельная очередь по пункту программы — осознанный заход «пройти тему»,
  // а не ежедневная порция: дневной лимит новых к ней не применяется, и идёт
  // она по порядку разделов. Общая очередь остаётся в лимите и вперемешку.
  const fresh = only
    ? pool.filter((c) => c.srs.state === 'new').sort((a, b) => drillOrder.get(a.id) - drillOrder.get(b.id))
    : shuffle(pool.filter((c) => c.srs.state === 'new'))
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, Math.max(0, db.config.newPerDay - doneToday.new))

  const queue = [...due.slice(0, Math.max(0, db.config.maxReviewsPerDay - doneToday.reviews)), ...learning, ...fresh]
  res.json({
    queue: queue.map((c) => c.id),
    counts: { due: due.length, learning: learning.length, new: fresh.length, newTotal: pool.filter((c) => c.srs.state === 'new').length },
    focused,
  })
})

app.post('/api/review', (req, res) => {
  const db = getDb()
  const { id, grade, ms } = req.body ?? {}
  const card = db.cards[id]
  if (!card) return res.status(404).json({ error: 'Карточка не найдена' })
  if (![0, 1, 2, 3].includes(grade)) return res.status(400).json({ error: 'Некорректная оценка' })

  const wasNew = card.srs.state === 'new'
  const wasState = card.srs.state
  const wasMature = card.srs.interval >= 21
  card.srs = applyReview(card.srs, grade)
  // was — в каком состоянии карточка была до ответа. По нему расписание отличает
  // «учила новое» (new, learning) от «повторяла пройденное» (review, relearning).
  db.log.push({ id, grade, ts: Date.now(), ms: ms ?? null, topic: card.topic, was: wasState })
  if (db.log.length > 20000) db.log.splice(0, db.log.length - 20000)
  bumpDaily(db, wasNew ? 'new' : 'reviews')

  const reward = award(
    db.game,
    { type: 'review', grade, wasNew, becameMastered: !wasMature && card.srs.interval >= 21 },
    gameContext(db),
  )
  persist()
  res.json({ ...card, reward })
})

app.post('/api/cards/:id/suspend', (req, res) => {
  const db = getDb()
  const card = db.cards[req.params.id]
  if (!card) return res.status(404).json({ error: 'Карточка не найдена' })
  card.suspended = !card.suspended
  persist()
  res.json(card)
})

app.post('/api/cards/:id/reset', (req, res) => {
  const db = getDb()
  const card = db.cards[req.params.id]
  if (!card) return res.status(404).json({ error: 'Карточка не найдена' })
  card.srs = newSrs()
  persist()
  res.json(card)
})

// ---------------------------------------------------------------- CRUD

app.post('/api/cards', (req, res) => {
  const db = getDb()
  const { question, answer, topic, topicTitle, tags, level, source, sourceFile } = req.body ?? {}
  if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: 'Нужны вопрос и ответ' })
  const card = {
    id: uid(source === 'notes' ? 'note' : 'my'),
    topic: topic || 'custom',
    topicTitle: topicTitle || 'Мои карточки',
    question: question.trim(),
    answer: answer.trim(),
    tags: tags ?? [],
    level: level ?? 'middle',
    source: source === 'notes' ? 'notes' : 'manual',
    sourceFile: sourceFile ?? null,
    createdAt: new Date().toISOString(),
    srs: newSrs(),
  }
  db.cards[card.id] = card
  persistNow()
  res.json(card)
})

app.put('/api/cards/:id', (req, res) => {
  const db = getDb()
  const card = db.cards[req.params.id]
  if (!card) return res.status(404).json({ error: 'Карточка не найдена' })
  const { question, answer, tags, level, topic, topicTitle } = req.body ?? {}
  Object.assign(card, {
    question: question ?? card.question,
    answer: answer ?? card.answer,
    tags: tags ?? card.tags,
    level: level ?? card.level,
    topic: topic ?? card.topic,
    topicTitle: topicTitle ?? card.topicTitle,
    edited: true, // помечаем, чтобы пересид не затёр правки
  })
  persistNow()
  res.json(card)
})

app.delete('/api/cards/:id', (req, res) => {
  const db = getDb()
  if (!db.cards[req.params.id]) return res.status(404).json({ error: 'Карточка не найдена' })
  delete db.cards[req.params.id]
  persistNow()
  res.json({ ok: true })
})

/** Массовое создание — используется при импорте секций заметки. */
app.post('/api/cards/bulk', (req, res) => {
  const db = getDb()
  const items = req.body?.cards ?? []
  const created = []
  for (const item of items) {
    if (!item.question?.trim() || !item.answer?.trim()) continue
    const card = {
      id: uid('note'),
      topic: item.topic || 'notes',
      topicTitle: item.topicTitle || 'Мои конспекты',
      question: item.question.trim(),
      answer: item.answer.trim(),
      tags: item.tags ?? [],
      level: item.level ?? 'middle',
      source: 'notes',
      sourceFile: item.sourceFile ?? null,
      createdAt: new Date().toISOString(),
      srs: newSrs(),
    }
    db.cards[card.id] = card
    created.push(card)
  }
  const reward = created.length
    ? award(db.game, { type: 'noteToCard', count: created.length }, gameContext(db))
    : null
  persistNow()
  res.json({ created: created.length, cards: created, reward })
})

// ---------------------------------------------------------------- заметки

app.get('/api/notes', (_req, res) => {
  const db = getDb()
  res.json({ ...scanNotes(db.config.notesDir), bundled: isBundled(db.config.notesDir) })
})

/**
 * Карточки заметки, сгруппированные по разделам «## N.», и карточки-вопросы,
 * сделанные из этого же раздела.
 *
 * Связь держится на нумерации: карточки из конспектов пронумерованы по разделу
 * исходного файла (`pr-3-1` — третий раздел «Процессов»), и это совпадает во
 * всех восьми файлах.
 */
/**
 * Всё, что идёт до первого раздела «## N.», — не учебный материал, а описание
 * файла. Первый абзац говорит, о чём файл; остальное — про происхождение
 * материала, и запоминать его не нужно. Поэтому наружу они уходят порознь:
 * первый как описание, остальное — в подсказку.
 */
function noteIntro(cards) {
  const intro = cards.filter((c) => c.group == null)
  if (intro.length === 0) return null

  const text = intro
    .map((c) =>
      c.body
        .split('\n')
        // callout'ы Obsidian: убираем служебную шапку и знаки цитаты
        .filter((l) => !/^>\s*\[!/.test(l))
        .map((l) => l.replace(/^>\s?/, ''))
        .join('\n'),
    )
    .join('\n\n')

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean)

  return {
    lead: paragraphs[0] ?? '',
    rest: paragraphs.slice(1).join('\n\n'),
  }
}

/** Карточки, которые реально читают: описание файла в счёт не идёт. */
function studyCards(cards) {
  return cards.filter((c) => c.group != null)
}

/**
 * Объём карточки в знаках — мера того, сколько там читать.
 *
 * Разметка схем выброшена: две тысячи символов SVG рисуют картинку, которую
 * смотрят пару секунд, и в объёме материала им делать нечего. Считать шкалу по
 * числу карточек нельзя: они различаются в десятки раз, от двух строк до
 * страницы, и «31 из 695» говорит о пройденном пути неправду.
 */
function cardChars(card) {
  return card.body.replace(/<svg[\s\S]*?<\/svg>/g, '').trim().length
}

/** Заголовки разделов «## N.»: номер → текст заголовка. */
function sectionTitles(content) {
  const out = {}
  let fence = false
  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    if (fence) continue
    const m = line.match(/^##\s+((\d+)\..*)$/)
    if (m) out[Number(m[2])] = m[1].trim()
  }
  return out
}

function noteGroups(db, rel, cards) {
  const cardsByGroup = new Map()
  for (const card of Object.values(db.cards)) {
    if (card.sourceFile !== rel) continue
    const m = /^[a-z]+-(\d+)-/.exec(card.id)
    if (!m) continue
    const group = Number(m[1])
    if (!cardsByGroup.has(group)) cardsByGroup.set(group, [])
    cardsByGroup.get(group).push(card.id)
  }

  const order = []
  const seen = new Map()
  for (const c of cards) {
    if (c.group == null) continue
    if (!seen.has(c.group)) {
      seen.set(c.group, { group: c.group, title: null, cardIndexes: [], cardIds: [] })
      order.push(seen.get(c.group))
    }
    seen.get(c.group).cardIndexes.push(c.index)
  }

  // Заголовок раздела не попадает в карточки — достаём его из исходного текста.
  for (const g of order) {
    g.cardIds = (cardsByGroup.get(g.group) ?? []).sort()
  }
  return order
}

app.get('/api/notes/file', (req, res) => {
  const db = getDb()
  try {
    const rel = String(req.query.rel ?? '')
    const note = readNote(db.config.notesDir, rel)
    const cards = splitCards(note.content)
    res.json({
      rel: note.rel,
      content: note.content,
      sections: note.sections,
      cards: withChecks(rel, cards),
      intro: noteIntro(cards),
      groups: noteGroups(db, rel, cards),
      titles: sectionTitles(note.content),
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * Правка одной карточки конспекта.
 *
 * Единственный маршрут, который пишет в конспекты. Клиент присылает исходный
 * текст карточки — сервер сверяет его с файлом и отказывается писать, если файл
 * успели изменить снаружи. После записи номера карточек могут сдвинуться, если
 * добавили или убрали заголовок, поэтому отметки прочитанного сразу переносятся.
 */
app.put('/api/notes/card', (req, res) => {
  const db = getDb()
  const { rel, index, body, original } = req.body ?? {}
  if (typeof rel !== 'string' || typeof index !== 'number') {
    return res.status(400).json({ error: 'Нужны rel и index' })
  }

  let result
  try {
    result = writeCard(db.config.notesDir, rel, index, body, original)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const { moved, dropped } = remapMarksForFile(db, rel, result.cards)
  if (moved || dropped) persistNow()

  res.json({
    cards: withChecks(rel, result.cards),
    groups: noteGroups(db, rel, result.cards),
    titles: sectionTitles(result.content),
    marksMoved: moved,
    marksDropped: dropped,
  })
})

/**
 * «Не вспомнила» в самопроверке по карточке — карточка уходит в повторение.
 *
 * Создаётся сразу в обучении со сроком «сейчас», а не новой: новые ждут своей
 * очереди под дневным лимитом, а невспомненное должно вернуться в тот же день.
 * Повторный промах ничего не дублирует — та же карточка снова становится
 * ближайшей. Её дальнейшая судьба — обычное интервальное повторение.
 */
app.post('/api/notes/selfcheck/miss', (req, res) => {
  const db = getDb()
  const { rel, group, title } = req.body ?? {}
  if (typeof rel !== 'string' || typeof group !== 'number') {
    return res.status(400).json({ error: 'Нужны rel и group' })
  }
  let note
  try {
    note = withChecks(rel, splitCards(readNote(db.config.notesDir, rel).content))
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
  const source = note.find((c) => c.group === group && (c.title ?? '') === (title ?? ''))
  if (!source) return res.status(409).json({ error: 'Карточка в конспекте не найдена — обнови страницу' })

  const key = missKey(rel, group, title)
  const now = Date.now()
  const existing = Object.values(db.cards).find((c) => c.selfcheck === key)
  if (existing) {
    // Уже в повторении: снова на ближайший показ. Если она была выучена —
    // это промах, как «снова» в обычном повторении
    existing.suspended = false
    if (existing.srs.state === 'review') existing.srs = applyReview(existing.srs, 0, now)
    else existing.srs = { ...existing.srs, state: 'learning', step: 0, due: new Date(now).toISOString() }
    persistNow()
    return res.json({ card: existing, created: false })
  }

  const deck = deckOfFile(rel)
  const sectionTitle = sectionTitles(readNote(db.config.notesDir, rel).content)[group]
  const { question, answer } = missQuestion(source, sectionTitle)
  const card = {
    id: uid('note'),
    topic: deck,
    topicTitle: Object.values(db.cards).find((c) => c.topic === deck)?.topicTitle ?? 'Мои конспекты',
    question,
    answer,
    tags: ['самопроверка'],
    level: 'middle',
    source: 'notes',
    sourceFile: rel,
    createdAt: new Date(now).toISOString(),
    selfcheck: key,
    srs: { ...newSrs(), state: 'learning', step: 0, due: new Date(now).toISOString() },
  }
  db.cards[card.id] = card
  persistNow()
  res.json({ card, created: true })
})

/** Проверка себя сразу после прочитанного раздела: бонус за то, что она была. */
app.post('/api/notes/section-check', (req, res) => {
  const db = getDb()
  const { recalled, total } = req.body ?? {}
  if (typeof total !== 'number' || total <= 0) {
    return res.status(400).json({ error: 'Нужно количество карточек' })
  }
  const reward = award(
    db.game,
    { type: 'sectionCheck', recalled: Number(recalled) || 0, total },
    gameContext(db),
  )
  persistNow()
  res.json({ reward })
})

app.get('/api/notes/search', (req, res) => {
  const db = getDb()
  res.json(searchNotes(db.config.notesDir, String(req.query.q ?? '')))
})

/** Проверка папки до сохранения настроек — чтобы не сохранить опечатку. */
app.get('/api/notes/check', (req, res) => {
  const raw = String(req.query.dir ?? '')
  const dir = resolveDir(raw)
  if (!dir) return res.json({ ok: false, message: 'Путь не указан' })
  if (isBundled(raw)) {
    const { files } = scanNotes('')
    return res.json({
      ok: true,
      resolved: dir,
      count: files.length,
      message: `Встроенные конспекты: ${files.length} файлов`,
    })
  }
  if (!fs.existsSync(dir)) return res.json({ ok: false, resolved: dir, message: 'Папка не существует' })
  if (!fs.statSync(dir).isDirectory()) return res.json({ ok: false, resolved: dir, message: 'Это файл, а не папка' })
  const { files } = scanNotes(dir)
  res.json({ ok: true, resolved: dir, count: files.length, message: `Найдено md-файлов: ${files.length}` })
})

// ---------------------------------------------------------------- проверка уровня

/**
 * Вопросы ревьюера — карточки с дословной репликой из скрипта собеседования.
 * Это отдельная категория: по ним быстро проверяется, что реально готово.
 */
app.get('/api/interview', (_req, res) => {
  const db = getDb()
  const questions = Object.values(db.cards)
    .filter((c) => c.asked)
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  res.json({ questions, checkups: db.checkups.slice(-10) })
})

app.post('/api/checkup', (req, res) => {
  const db = getDb()
  const results = req.body?.results ?? {}
  const values = Object.values(results)
  if (values.length === 0) return res.status(400).json({ error: 'Пустой результат' })

  const checkup = {
    ts: Date.now(),
    total: values.length,
    know: values.filter((v) => v === 'know').length,
    weak: values.filter((v) => v === 'weak').length,
    no: values.filter((v) => v === 'no').length,
    results,
  }
  db.checkups.push(checkup)
  if (db.checkups.length > 50) db.checkups.splice(0, db.checkups.length - 50)

  const reward = award(
    db.game,
    { type: 'checkup', total: checkup.total, know: checkup.know, no: checkup.no },
    gameContext(db),
  )
  persistNow()
  res.json({ ...checkup, reward })
})

/** Отправить провалы проверки в очередь повторения — сбросом расписания. */
app.post('/api/checkup/to-review', (req, res) => {
  const db = getDb()
  const ids = req.body?.ids ?? []
  let reset = 0
  for (const id of ids) {
    const card = db.cards[id]
    if (!card) continue
    card.srs = newSrs()
    card.suspended = false
    reset += 1
  }
  persistNow()
  res.json({ reset })
})

// ---------------------------------------------------------------- мини-тесты

app.get('/api/quiz', (_req, res) => {
  const db = getDb()
  res.json({ bundles: readQuizzes(), attempts: db.quizAttempts.slice(-60) })
})

app.post('/api/quiz/attempt', (req, res) => {
  const db = getDb()
  const { topic, total, correct, results } = req.body ?? {}
  if (!topic || typeof total !== 'number') return res.status(400).json({ error: 'Некорректная попытка' })

  const attempt = { ts: Date.now(), topic, total, correct: correct ?? 0, results: results ?? {} }
  db.quizAttempts.push(attempt)
  if (db.quizAttempts.length > 300) db.quizAttempts.splice(0, db.quizAttempts.length - 300)

  const reward = award(
    db.game,
    { type: 'quiz', total, correct: correct ?? 0, bestCombo: req.body?.bestCombo ?? 0 },
    gameContext(db),
  )
  persistNow()
  res.json({ ...attempt, reward })
})

// ---------------------------------------------------------------- разведка конспектов

const markKey = (rel, index) => `${rel}#${index}`

/**
 * Отметки прочитанного привязаны к НОМЕРУ карточки в файле, а номер сдвигается
 * от любой правки текста выше. Рядом с отметкой лежит её заголовок — по нему и
 * восстанавливаем номер, если он разъехался.
 *
 * Гоняется один раз на старте: правки конспектов случаются между запусками.
 */
/**
 * Заголовок для сверки отметок — без пометки 💡. Её дописывают к уже
 * существующей карточке, и прочитанная карточка от этого другой не становится;
 * без этого отметка «прочитано» снималась при первом же запуске.
 */
const markTitle = (title) => (title ?? '').replace(/^💡\s*/u, '')

function remapMarksForFile(db, rel, cards) {
  const byIndex = new Map(cards.map((c) => [c.index, markTitle(c.title)]))

  // Заголовок сам по себе не опознаёт карточку: «Как звучало на собеседовании»
  // есть в каждом разделе файла. Поэтому основной ключ — раздел плюс заголовок,
  // а по одному заголовку двигаем, только если он в файле единственный.
  const byGroupTitle = new Map()
  const titleCount = new Map()
  for (const c of cards) {
    if (!c.title) continue
    const title = markTitle(c.title)
    const key = `${c.group}\u0000${title}`
    if (!byGroupTitle.has(key)) byGroupTitle.set(key, c.index)
    titleCount.set(title, (titleCount.get(title) ?? 0) + 1)
  }
  const byUniqueTitle = new Map()
  for (const c of cards) {
    const title = markTitle(c.title)
    if (title && titleCount.get(title) === 1) byUniqueTitle.set(title, c.index)
  }

  const findIndex = (mark) => {
    const title = markTitle(mark.title)
    if (mark.group != null) {
      const hit = byGroupTitle.get(`${mark.group}\u0000${title}`)
      if (hit != null) return hit
    }
    return byUniqueTitle.get(title)
  }

  const marks = {}
  const awarded = {}
  let moved = 0
  let dropped = 0

  for (const [key, value] of Object.entries(db.reading.marks)) {
    if (!key.startsWith(`${rel}#`)) {
      marks[key] = value
      if (db.reading.awarded[key]) awarded[key] = db.reading.awarded[key]
      continue
    }
    const index = Number(key.slice(rel.length + 1))
    if (byIndex.get(index) === markTitle(value.title)) {
      marks[key] = value
      if (db.reading.awarded[key]) awarded[key] = db.reading.awarded[key]
      continue
    }
    const target = value.title ? findIndex(value) : undefined
    if (target != null) {
      const next = markKey(rel, target)
      marks[next] = value
      if (db.reading.awarded[key]) awarded[next] = db.reading.awarded[key]
      moved += 1
      continue
    }
    // Заголовка больше нет — оставлять отметку на чужой карточке нельзя.
    dropped += 1
  }

  db.reading.marks = marks
  db.reading.awarded = awarded
  return { moved, dropped }
}

export function reconcileReadingMarks(db) {
  const { files } = scanNotes(db.config.notesDir)
  let moved = 0
  let dropped = 0

  for (const f of files) {
    let cards = []
    try {
      cards = splitCards(readNote(db.config.notesDir, f.rel).content)
    } catch {
      continue
    }
    const r = remapMarksForFile(db, f.rel, cards)
    moved += r.moved
    dropped += r.dropped
  }

  if (moved > 0 || dropped > 0) {
    persistNow()
    console.log(`[reading] конспекты изменились: перенесено ${moved}, снято ${dropped}`)
  }
}

/**
 * Покрытие. Считается по карточкам — это единица чтения, — но наружу отдаётся
 * ещё и в разделах: «12 из 58 разделов» человеку понятнее, чем «139 из 695».
 * Раздел считается пройденным, когда прочитаны все его карточки.
 */
function readingCoverage(db) {
  const { files } = scanNotes(db.config.notesDir)
  return files.map((f) => {
    let cards = []
    try {
      cards = splitCards(readNote(db.config.notesDir, f.rel).content)
    } catch {
      cards = []
    }
    const isRead = (c) => !!db.reading.marks[markKey(f.rel, c.index)]
    const study = studyCards(cards)
    const groups = new Map()
    for (const c of study) {
      if (!groups.has(c.group)) groups.set(c.group, [])
      groups.get(c.group).push(c)
    }
    return {
      rel: f.rel,
      name: f.name,
      title: f.title,
      total: groups.size,
      read: [...groups.values()].filter((g) => g.every(isRead)).length,
      cardsTotal: study.length,
      cardsRead: study.filter(isRead).length,
      charsTotal: study.reduce((sum, c) => sum + cardChars(c), 0),
      charsRead: study.filter(isRead).reduce((sum, c) => sum + cardChars(c), 0),
    }
  })
}

app.get('/api/reading', (_req, res) => {
  const db = getDb()
  const coverage = readingCoverage(db)
  res.json({
    marks: db.reading.marks,
    coverage,
    totals: {
      read: coverage.reduce((s, f) => s + f.read, 0),
      total: coverage.reduce((s, f) => s + f.total, 0),
      charsRead: coverage.reduce((s, f) => s + f.charsRead, 0),
      charsTotal: coverage.reduce((s, f) => s + f.charsTotal, 0),
      filesDone: coverage.filter((f) => f.total > 0 && f.read >= f.total).length,
    },
  })
})

/**
 * Прочитанное по разделам «## N.»: rel → Map(номер → счётчики).
 * Программа подготовки привязывает пункты к разделам, а не к файлам целиком:
 * в одном конспекте лежат и сортировка, и приведение типов.
 */
function readingByGroup(db, files) {
  const out = new Map()
  for (const f of files) {
    let content = ''
    try {
      content = readNote(db.config.notesDir, f.rel).content
    } catch {
      continue
    }
    const titles = sectionTitles(content)
    const groups = new Map()
    for (const c of studyCards(splitCards(content))) {
      if (!groups.has(c.group)) {
        groups.set(c.group, {
          title: titles[c.group] ?? `Раздел ${c.group}`,
          charsTotal: 0, charsRead: 0, cardsTotal: 0, cardsRead: 0,
        })
      }
      const g = groups.get(c.group)
      const chars = cardChars(c)
      g.charsTotal += chars
      g.cardsTotal += 1
      if (db.reading.marks[markKey(f.rel, c.index)]) {
        g.charsRead += chars
        g.cardsRead += 1
      }
    }
    out.set(f.rel, groups)
  }
  return out
}

// ---------------------------------------------------------------- программа

app.get('/api/program', (_req, res) => {
  const db = getDb()
  const program = readProgram()
  if (!program) return res.json(null)
  const { files } = scanNotes(db.config.notesDir)
  res.json(
    programView(program, {
      db,
      files,
      groupStats: readingByGroup(db, files),
      quizBundles: readQuizzes(),
    }),
  )
})

/**
 * Закрыть шаг расписания руками или снять такую отметку. Нужно для шагов,
 * которые приложение увидеть не может: задача в редакторе, рассказ о себе.
 * Шаг, закрывшийся сам, этой отметкой не открыть — он выполнен по факту.
 */
app.post('/api/program/step', (req, res) => {
  const db = getDb()
  const program = readProgram()
  const { id, done } = req.body ?? {}
  if (!hasStep(program, id)) return res.status(404).json({ error: 'Такого шага в расписании нет' })
  db.schedule ??= { done: {} }
  db.schedule.done ??= {}
  if (done) db.schedule.done[id] = Date.now()
  else delete db.schedule.done[id]
  persistNow()
  res.json({ id, done: !!db.schedule.done[id] })
})

/** Отметить раздел прочитанным или снять отметку. Опыт даётся один раз за раздел. */
app.post('/api/reading/toggle', (req, res) => {
  const db = getDb()
  const { rel, title } = req.body ?? {}
  let { index } = req.body ?? {}
  if (!rel || typeof index !== 'number') return res.status(400).json({ error: 'Нужны rel и index' })

  let fileCards = []
  try {
    fileCards = splitCards(readNote(db.config.notesDir, rel).content)
  } catch {
    fileCards = []
  }

  // Номер карточки присылает страница, а она могла загрузить конспект до того,
  // как в него добавили карточку: тогда все номера ниже вставки сдвинуты, и
  // отметка легла бы на соседнюю карточку. Поэтому номеру верим, только если по
  // нему лежит карточка с тем же заголовком; иначе ищем её по заголовку рядом.
  let stale = false
  if (title && fileCards.length && markTitle(fileCards[index]?.title) !== markTitle(title)) {
    const same = fileCards.filter((c) => markTitle(c.title) === markTitle(title))
    if (same.length === 0) {
      return res.status(409).json({ error: 'Конспект изменился — обнови страницу', stale: true })
    }
    same.sort((a, b) => Math.abs(a.index - index) - Math.abs(b.index - index))
    index = same[0].index
    stale = true
  }

  const key = markKey(rel, index)
  let reward = null

  if (db.reading.marks[key]) {
    delete db.reading.marks[key]
  } else {
    const card = fileCards[index] ?? null
    // Номер раздела храним рядом с заголовком: заголовки вроде «Коротко» есть в
    // каждом разделе, и по одному тексту карточку потом не опознать.
    db.reading.marks[key] = { ts: Date.now(), title: title ?? '', group: card?.group ?? null }
    // повторная отметка той же карточки опыта не приносит — иначе это фарм
    if (!db.reading.awarded[key]) {
      db.reading.awarded[key] = true
      let cards = []
      try {
        cards = splitCards(readNote(db.config.notesDir, rel).content)
      } catch {
        cards = []
      }
      const study = studyCards(cards)
      const readInFile = study.filter((c) => db.reading.marks[markKey(rel, c.index)]).length
      reward = award(
        db.game,
        { type: 'read', fileDone: study.length > 0 && readInFile >= study.length },
        gameContext(db),
      )
    }
  }

  persistNow()
  // stale — страница работает со старым списком карточек и должна его перечитать
  res.json({ marked: !!db.reading.marks[key], reward, stale, index })
})

// ---------------------------------------------------------------- восхождение

app.get('/api/game', (_req, res) => {
  const db = getDb()
  const ctx = gameContext(db)

  // прогресс по темам — высота каждой вершины на карте
  const topics = new Map()
  for (const card of Object.values(db.cards)) {
    if (!topics.has(card.topic)) {
      topics.set(card.topic, {
        topic: card.topic,
        title: card.topicTitle,
        kb: card.topic.startsWith('kb-'), // тема из собственных конспектов
        total: 0, seen: 0, mastered: 0,
      })
    }
    const t = topics.get(card.topic)
    t.total += 1
    if (card.srs.state !== 'new') t.seen += 1
    if (card.srs.interval >= 21) t.mastered += 1
  }

  const bestQuiz = {}
  for (const a of db.quizAttempts) {
    const percent = Math.round((a.correct / a.total) * 100)
    if (!(a.topic in bestQuiz) || percent > bestQuiz[a.topic]) bestQuiz[a.topic] = percent
  }

  const coverage = readingCoverage(db)
  res.json({
    game: db.game,
    level: levelOf(db.game.xp),
    progress: dailyProgress(db.game.daily),
    reading: {
      read: coverage.reduce((s, f) => s + f.read, 0),
      total: coverage.reduce((s, f) => s + f.total, 0),
      charsRead: coverage.reduce((s, f) => s + f.charsRead, 0),
      charsTotal: coverage.reduce((s, f) => s + f.charsTotal, 0),
      files: coverage,
    },
    topics: [...topics.values()].map((t) => ({ ...t, bestQuiz: bestQuiz[t.topic] ?? null })),
    achievements: ACHIEVEMENTS.map((a) => ({
      id: a.id, title: a.title, hint: a.hint, group: a.group, secret: !!a.secret,
      unlockedAt: db.game.achievements[a.id] ?? null,
    })),
    context: ctx,
    decor: decorOf(db.shop),
  })
})

// ------------------------------------------------------------------- магазин

app.get('/api/shop', (_req, res) => {
  const db = getDb()
  res.json({ mana: db.game.mana, earned: db.game.manaEarned, items: shopView(db.shop, db.game.mana) })
})

app.post('/api/shop/buy', (req, res) => {
  const db = getDb()
  const result = buyItem(db, req.body?.id)
  if (result.error) return res.status(400).json({ error: result.error })

  // Покупка может открыть достижение — опыта она при этом не приносит.
  const unlocked = checkAchievements(db.game, { ...gameContext(db), hour: new Date().getHours() })
  persistNow()
  res.json({
    bought: result.item,
    mana: db.game.mana,
    items: shopView(db.shop, db.game.mana),
    decor: decorOf(db.shop),
    unlocked,
  })
})

app.post('/api/shop/equip', (req, res) => {
  const db = getDb()
  const result = equipItem(db, req.body?.id, !!req.body?.on)
  if (result.error) return res.status(400).json({ error: result.error })
  persistNow()
  res.json({ items: shopView(db.shop, db.game.mana), decor: decorOf(db.shop) })
})

app.put('/api/game/goal', (req, res) => {
  const db = getDb()
  const goal = Number(req.body?.goal)
  if (!Number.isFinite(goal) || goal < 1 || goal > 200) return res.status(400).json({ error: 'Некорректная цель' })
  db.game.daily.goal = Math.round(goal)
  persistNow()
  res.json(db.game.daily)
})

// ---------------------------------------------------------------- статистика

app.get('/api/stats', (_req, res) => {
  const db = getDb()
  const cards = Object.values(db.cards)
  const byTopic = {}
  for (const c of cards) {
    byTopic[c.topic] ??= { topic: c.topic, title: c.topicTitle, total: 0, new: 0, learning: 0, review: 0, mature: 0 }
    const t = byTopic[c.topic]
    t.total += 1
    if (c.srs.state === 'new') t.new += 1
    else if (c.srs.state === 'review') {
      t.review += 1
      if (c.srs.interval >= 21) t.mature += 1
    } else t.learning += 1
  }

  // Ретеншн: доля ответов «не снова» среди повторений (без первых показов).
  const recent = db.log.slice(-500)
  const graded = recent.filter((l) => l.grade !== undefined)
  const retention = graded.length ? graded.filter((l) => l.grade > 0).length / graded.length : null

  const weakest = cards
    .filter((c) => c.srs.lapses > 0)
    .sort((a, b) => b.srs.lapses - a.srs.lapses || a.srs.ease - b.srs.ease)
    .slice(0, 12)
    .map((c) => ({ id: c.id, question: c.question, topic: c.topic, lapses: c.srs.lapses, ease: c.srs.ease }))

  res.json({ byTopic: Object.values(byTopic), retention, daily: db.daily, weakest, total: cards.length })
})

app.post('/api/reset-progress', (req, res) => {
  const db = getDb()
  const scope = req.body?.topic
  for (const card of Object.values(db.cards)) {
    if (scope && card.topic !== scope) continue
    card.srs = newSrs()
  }
  if (!scope) {
    db.log = []
    db.daily = {}
  }
  persistNow()
  res.json({ ok: true })
})
