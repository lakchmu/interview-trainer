import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './db.mjs'

// Какая программа сейчас действует. Личные программы под конкретные вакансии
// (frontend.json, ozon.json) в репозиторий не попадают; без них — demo.json,
// тот же список тем на публичном материале.
const PROGRAM_DIR = path.join(ROOT, 'data', 'program')
const PROGRAM_FILE = path.join(PROGRAM_DIR, `${process.env.PROGRAM ?? pickProgram()}.json`)

function pickProgram() {
  return fs.existsSync(path.join(PROGRAM_DIR, 'frontend.json')) ? 'frontend' : 'demo'
}

/**
 * Программа подготовки под конкретную компанию.
 *
 * Список тем взят со страницы работодателя и лежит данными, а не кодом: когда
 * страница изменится, правится один JSON. Каждая тема привязана к материалу,
 * который в приложении уже есть, — к карточкам (по колоде, тегам или номеру
 * раздела) и к разделам конспектов. Тема без привязок честно показывается
 * пробелом: лучше увидеть дыру в плане, чем узнать о ней на собеседовании.
 *
 * Читается при каждом запросе, как и мини-тесты: файл маленький, зато правки
 * видны без перезапуска.
 */
export function readProgram() {
  try {
    return JSON.parse(fs.readFileSync(PROGRAM_FILE, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[program] не читается ${PROGRAM_FILE}: ${err.message}`)
    return null
  }
}

/** Номер раздела конспекта, из которого сделана карточка: `vue-3-2` → 3. */
function groupOfCard(card) {
  const m = /^[a-z]+-(\d+)-/.exec(card.id)
  return m ? Number(m[1]) : null
}

function matches(rule, card) {
  if (rule.ids) return rule.ids.includes(card.id)
  if (rule.topic && rule.topic !== card.topic) return false
  if (rule.tags && !rule.tags.some((t) => card.tags.includes(t))) return false
  if (rule.groups && !rule.groups.includes(groupOfCard(card))) return false
  return true
}

const topicHas = (topic, card) => (topic.cards ?? []).some((rule) => matches(rule, card))

const coreTopics = (program) => program.blocks.flatMap((b) => b.topics)
const adjacentTopics = (program) => program.adjacent?.topics ?? []

/**
 * Куда относится карточка:
 *   core     — закрывает пункт из списка работодателя;
 *   adjacent — рядом со списком (или просто не размечена: своя карточка,
 *              вопрос из общей колоды без подходящего тега);
 *   out      — колода, которой в списке нет вовсе.
 * Неразмеченное считается «рядом», а не «вне»: спрятать по ошибке хуже, чем
 * показать лишнее.
 */
export function scopeOfCard(program, card) {
  if (!program) return 'core'
  if (coreTopics(program).some((t) => topicHas(t, card))) return 'core'
  if (adjacentTopics(program).some((t) => topicHas(t, card))) return 'adjacent'
  if (program.out?.decks?.includes(card.topic)) return 'out'
  return 'adjacent'
}

const byId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })

/**
 * Карточки пунктов программы — для прицельной очереди.
 *
 * Порядок осмысленный: пункты идут так, как их перечислили, карточки внутри —
 * по номеру. Прицельную очередь открывают сразу после чтения раздела, и вопросы
 * должны идти в том же порядке, что и текст, а не вперемешку.
 */
export function cardsOfTopics(program, topicIds, cards) {
  const all = [...coreTopics(program), ...adjacentTopics(program)]
  const seen = new Set()
  const out = []
  for (const id of topicIds) {
    const topic = all.find((t) => t.id === id)
    if (!topic) continue
    for (const card of cards.filter((c) => topicHas(topic, c)).sort(byId)) {
      if (seen.has(card.id)) continue
      seen.add(card.id)
      out.push(card)
    }
  }
  return out
}

/** Файл конспекта по номеру в начале имени: 9 → «9. Vue 3, Pinia и Nuxt 3.md». */
function fileByNumber(files, n) {
  return files.find((f) => new RegExp(`^${n}\\.(\\s|$)`).test(path.basename(f.rel))) ?? null
}

/**
 * Готовность пункта: среднее по тому, что у него есть, — доле прочитанного
 * текста и доле карточек, на которые уже отвечали. Чтение без карточек даёт
 * не больше половины: прочитать и суметь ответить — разные вещи, а на
 * интервью проверяют второе.
 */
function topicProgress(reading, cards) {
  const parts = []
  if (reading.charsTotal > 0) parts.push(reading.charsRead / reading.charsTotal)
  if (cards.total > 0) parts.push(cards.seen / cards.total)
  if (parts.length === 0) return 0
  return parts.reduce((s, p) => s + p, 0) / parts.length
}

function topicView(topic, ctx) {
  const { cards, files, groupStats, quizTitles, bestQuiz } = ctx

  const own = cards.filter((c) => !c.suspended && topicHas(topic, c))
  const cardStats = {
    total: own.length,
    seen: own.filter((c) => c.srs.state !== 'new').length,
    // «Закреплено» — карточка вышла из обучения в интервальное повторение
    solid: own.filter((c) => c.srs.state === 'review').length,
  }

  const reading = { charsTotal: 0, charsRead: 0, sections: 0, sectionsRead: 0 }
  const notes = []
  let nextRead = null
  for (const rule of topic.notes ?? []) {
    const file = fileByNumber(files, rule.file)
    if (!file) continue
    const byGroup = groupStats.get(file.rel) ?? new Map()
    const groups = rule.groups ?? [...byGroup.keys()]
    for (const g of groups) {
      const s = byGroup.get(g)
      if (!s) continue
      reading.charsTotal += s.charsTotal
      reading.charsRead += s.charsRead
      reading.sections += 1
      const done = s.cardsRead >= s.cardsTotal
      if (done) reading.sectionsRead += 1
      notes.push({ rel: file.rel, file: file.title, group: g, title: s.title, done })
      if (!done && !nextRead) nextRead = { rel: file.rel, group: g, title: s.title }
    }
  }

  const quiz = [...new Set(topic.quiz ?? [])]
    .filter((id) => quizTitles.has(id))
    .map((id) => ({ topic: id, title: quizTitles.get(id), best: bestQuiz[id] ?? null }))

  const empty = cardStats.total === 0 && reading.charsTotal === 0
  const progress = topicProgress(reading, cardStats)
  const status = empty ? 'gap' : progress >= 1 ? 'done' : progress > 0 ? 'progress' : 'todo'

  // Сначала дочитать, потом отвечать: карточки по непрочитанному — это угадывание.
  const next = nextRead
    ? { kind: 'read', ...nextRead }
    : cardStats.seen < cardStats.total
      ? { kind: 'cards', left: cardStats.total - cardStats.seen }
      : null

  return {
    id: topic.id,
    title: topic.title,
    detail: topic.detail ?? '',
    why: topic.why ?? '',
    cards: cardStats,
    reading,
    notes,
    quiz,
    progress,
    status,
    next,
  }
}

const mean = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0)

// ---------------------------------------------------------------- расписание

const pad = (n) => String(n).padStart(2, '0')
/** Дата по часам этого компьютера: день в расписании — это день человека, а не UTC. */
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayStart = (date) => new Date(`${date}T00:00:00`).getTime()
const DAY_MS = 86400000

const noteLink = (rel, group) =>
  `/notes?file=${encodeURIComponent(rel)}${group != null ? `&group=${group}` : ''}`

/**
 * Один шаг расписания: выполнен ли он и куда ведёт его кнопка.
 *
 * Шаг закрывается сам, когда это можно увидеть по данным: тест пройден в этот
 * день или позже, разделы прочитаны, на карточки ответили. Любой шаг можно
 * закрыть и руками — задачу в редакторе приложение не видит, а выборочное
 * чтение («только разделы с ошибками») до конца не дочитывают намеренно.
 */
function stepView(step, day, ctx) {
  const { db, cards, files, groupStats, program, now } = ctx
  const from = dayStart(day.date)
  const isToday = localDate(new Date(now)) === day.date
  const manual = !!db.schedule?.done?.[step.id]

  let auto = false
  let progress = null
  let result = null
  let link = null
  let action = null

  if (step.kind === 'quiz') {
    const mine = db.quizAttempts.filter((a) => a.topic === step.quiz && a.ts >= from)
    auto = mine.length > 0
    if (auto) result = `${Math.max(...mine.map((a) => Math.round((a.correct / a.total) * 100)))}%`
    link = `/quiz?topic=${step.quiz}`
    action = 'Тест'
  } else if (step.kind === 'read') {
    let total = 0
    let read = 0
    let first = null
    let next = null
    for (const rule of step.notes ?? []) {
      const file = fileByNumber(files, rule.file)
      if (!file) continue
      const byGroup = groupStats.get(file.rel) ?? new Map()
      for (const g of rule.groups ?? [...byGroup.keys()]) {
        const stat = byGroup.get(g)
        if (!stat) continue
        total += 1
        first ??= { rel: file.rel, group: g }
        if (stat.cardsRead >= stat.cardsTotal) read += 1
        else next ??= { rel: file.rel, group: g }
      }
    }
    auto = total > 0 && read >= total
    progress = { done: read, total, unit: 'sections' }
    const target = next ?? first
    link = target ? noteLink(target.rel, target.group) : null
    action = 'Читать'
  } else if (step.kind === 'cards') {
    const own = cardsOfTopics(program, step.topics ?? [], cards).filter((c) => !c.suspended)
    const seen = own.filter((c) => c.srs.state !== 'new').length
    auto = own.length > 0 && seen >= own.length
    progress = { done: seen, total: own.length, unit: 'cards' }
    link = `/review?program=${(step.topics ?? []).join(',')}`
    action = 'Учить'
  } else if (step.kind === 'review') {
    // Повторные показы именно в этот день: всё, кроме первого знакомства с
    // карточкой. Второй показ новой карточки тоже считается — без него она не
    // закреплена и в расписание повторений не попадает. От преждевременного
    // закрытия шаг защищает второе условие ниже: очередь должна быть пуста.
    const reviewed = db.log.filter(
      (l) => l.was && l.was !== 'new' && l.ts >= from && l.ts < from + DAY_MS,
    ).length
    const dueNow = cards.filter(
      (c) =>
        !c.suspended &&
        c.srs.state !== 'new' &&
        c.srs.due &&
        new Date(c.srs.due).getTime() <= now &&
        !(db.config.focus !== false && scopeOfCard(program, c) === 'out'),
    ).length
    // Сегодня шаг закрыт, когда очередь разобрана до конца; задним числом —
    // достаточно того, что в тот день повторяли.
    auto = reviewed > 0 && (!isToday || dueNow === 0)
    if (isToday && dueNow > 0) progress = { done: reviewed, total: reviewed + dueNow, unit: 'cards' }
    else if (reviewed > 0) result = `повторено ${reviewed}`
    link = '/review'
    action = 'Повторять'
  } else if (step.open) {
    const file = fileByNumber(files, step.open.file)
    link = file ? noteLink(file.rel, step.open.group) : null
    action = 'Открыть'
  }

  return {
    id: step.id,
    kind: step.kind,
    title: step.title,
    hint: step.hint ?? '',
    minutes: step.minutes ?? 0,
    optional: !!step.optional,
    done: auto || manual,
    auto,
    manual,
    progress,
    result,
    link,
    action,
  }
}

function scheduleView(program, ctx) {
  const plan = program.schedule
  if (!plan?.days?.length) return null
  const today = localDate(new Date(ctx.now))

  const days = plan.days.map((day) => {
    const steps = day.steps.map((s) => stepView(s, day, ctx))
    const required = steps.filter((s) => !s.optional)
    return {
      date: day.date,
      title: day.title,
      note: day.note ?? '',
      fresh: !!day.fresh,
      state: day.date < today ? 'past' : day.date === today ? 'today' : 'future',
      steps,
      total: required.length,
      done: required.filter((s) => s.done).length,
      minutesLeft: required.filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0),
    }
  })

  // Следующий шаг. Незакрытое со вчера идёт раньше сегодняшнего: расписание
  // выстроено по важности, и вчерашнее ядро JavaScript важнее сегодняшних
  // инструментов. Исключение — день с пометкой fresh (утро перед собеседованием):
  // там долги не подтягиваются, нового уже не начинают.
  const current = days.find((d) => d.state === 'today')
  // После срока расписание остаётся видно как итог, но больше никуда не зовёт
  const over = ctx.now >= new Date(plan.deadline).getTime()
  let next = null
  if (current && !over) {
    const pool = current.fresh ? [current] : days.filter((d) => d.state !== 'future')
    for (const day of pool) {
      const step = day.steps.find((s) => !s.done && !s.optional)
      if (step) {
        next = { date: day.date, overdue: day.date !== current.date, ...step }
        break
      }
    }
  }

  return {
    title: plan.title ?? 'Расписание',
    deadline: plan.deadline,
    // Чем кончается срок: собеседованием или, если дата не назначена, подготовкой
    deadlineLabel: plan.deadlineLabel ?? 'до собеседования',
    over,
    today,
    days,
    next,
  }
}

/**
 * Состояние программы целиком.
 *
 * groupStats — прочитанное по разделам: rel → Map(номер раздела → счётчики).
 * Считает его вызывающая сторона: там же лежат отметки чтения и правила, что
 * считать объёмом карточки.
 */
export function programView(program, { db, files, groupStats, quizBundles, now = Date.now() }) {
  const cards = Object.values(db.cards)
  const bestQuiz = {}
  for (const a of db.quizAttempts) {
    const percent = Math.round((a.correct / a.total) * 100)
    if (!(a.topic in bestQuiz) || percent > bestQuiz[a.topic]) bestQuiz[a.topic] = percent
  }
  const ctx = {
    cards,
    files,
    groupStats,
    bestQuiz,
    quizTitles: new Map(quizBundles.map((b) => [b.topic, b.title])),
  }

  const blocks = program.blocks.map((b) => {
    const topics = b.topics.map((t) => topicView(t, ctx))
    return { id: b.id, title: b.title, note: b.note ?? '', topics, progress: mean(topics.map((t) => t.progress)) }
  })
  const all = blocks.flatMap((b) => b.topics)

  const adjacentList = adjacentTopics(program).map((t) => topicView(t, ctx))
  const adjacent = program.adjacent
    ? {
        id: program.adjacent.id,
        title: program.adjacent.title,
        note: program.adjacent.note ?? '',
        topics: adjacentList,
        progress: mean(adjacentList.map((t) => t.progress)),
      }
    : null

  // Следующий шаг: блоки идут в порядке из файла программы (сначала то, чего
  // в базе не было вовсе), внутри блока — как на странице работодателя.
  const order = program.order ?? program.blocks.map((b) => b.id)
  let next = null
  for (const id of order) {
    const block = blocks.find((b) => b.id === id)
    const topic = block?.topics.find((t) => t.next)
    if (topic) {
      next = { block: block.title, topicId: topic.id, topic: topic.title, ...topic.next }
      break
    }
  }

  const scopes = { core: 0, adjacent: 0, out: 0 }
  const outDecks = new Map()
  for (const card of cards) {
    const scope = scopeOfCard(program, card)
    scopes[scope] += 1
    if (scope === 'out') {
      if (!outDecks.has(card.topic)) outDecks.set(card.topic, { topic: card.topic, title: card.topicTitle, total: 0 })
      outDecks.get(card.topic).total += 1
    }
  }

  // Файл в программе, если на него ссылается хоть один пункт; явно названные
  // в out — вне её. Остальные считаем соседними, по той же логике, что карточки.
  const fileScope = {}
  const used = (topics) =>
    new Set(
      topics.flatMap((t) => (t.notes ?? []).map((r) => fileByNumber(files, r.file)?.rel).filter(Boolean)),
    )
  const coreFiles = used(coreTopics(program))
  const outFiles = new Set((program.out?.files ?? []).map((n) => fileByNumber(files, n)?.rel).filter(Boolean))
  for (const f of files) {
    fileScope[f.rel] = coreFiles.has(f.rel) ? 'core' : outFiles.has(f.rel) ? 'out' : 'adjacent'
  }

  return {
    id: program.id,
    company: program.company,
    title: program.title,
    nav: program.nav ?? `План ${program.company}`,
    brand: program.brand ?? `${program.company} · Frontend`,
    heading: program.heading ?? `Подготовка к ${program.company}`,
    listName: program.listName ?? `программа ${program.company}`,
    resourcesTitle: program.resourcesTitle ?? 'Что почитать',
    resourcesNote: program.resourcesNote ?? '',
    source: program.source,
    rule: program.rule ?? '',
    resources: program.resources ?? [],
    focus: db.config.focus !== false,
    readiness: mean(all.map((t) => t.progress)),
    topicsTotal: all.length,
    topicsDone: all.filter((t) => t.status === 'done').length,
    gaps: all.filter((t) => t.status === 'gap').length,
    blocks,
    adjacent,
    out: {
      title: program.out?.title ?? 'Вне списка',
      note: program.out?.note ?? '',
      cards: scopes.out,
      decks: [...outDecks.values()],
      files: files.filter((f) => fileScope[f.rel] === 'out').map((f) => ({ rel: f.rel, title: f.title })),
    },
    scopes,
    fileScope,
    next,
    schedule: scheduleView(program, { db, cards, files, groupStats, program, now }),
  }
}

/** Есть ли в расписании шаг с таким id — чтобы не писать в базу что попало. */
export function hasStep(program, id) {
  return !!program?.schedule?.days?.some((d) => d.steps.some((s) => s.id === id))
}
