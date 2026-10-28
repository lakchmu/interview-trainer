import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyGame } from './game.mjs'
import { emptyShop } from './shop.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const SEED_DIR = path.join(DATA_DIR, 'seed')
/**
 * Путь к базе. Переопределяется через DB_FILE — это нужно, чтобы проверки
 * никогда не шли по живой базе с настоящим прогрессом.
 */
const DB_FILE = process.env.DB_FILE ?? path.join(DATA_DIR, 'db.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const KEEP_BACKUPS = 20

/**
 * Копия базы при каждом запуске приложения.
 *
 * Прогресс — единственное, что нельзя восстановить: карточки и конспекты лежат
 * в файлах, а прожитые дни нет. Один снимок на запуск стоит меньше мегабайта и
 * отменяет любую ошибку — свою, чужую или случайное удаление.
 */
function backupOnBoot() {
  // Копии делаются только для настоящей базы: тестовую незачем архивировать
  if (process.env.DB_FILE) return
  if (!fs.existsSync(DB_FILE)) return
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const target = path.join(BACKUP_DIR, `db-${stamp}.json`)
    if (!fs.existsSync(target)) fs.copyFileSync(DB_FILE, target)

    const old = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('db-') && f.endsWith('.json'))
      .sort()
      .slice(0, -KEEP_BACKUPS)
    for (const f of old) fs.unlinkSync(path.join(BACKUP_DIR, f))
  } catch (err) {
    console.error('[db] не удалось сделать копию:', err.message)
  }
}

const DEFAULT_CONFIG = {
  notesDir: '',
  newPerDay: 15,
  maxReviewsPerDay: 120,
  theme: 'dark',
  // Ежедневная очередь только по программе подготовки (data/program).
  focus: true,
}

/** In-memory database; persisted to data/db.json on every mutation (debounced). */
let db = null
let writeTimer = null

function emptyDb() {
  return {
    version: 1,
    config: { ...DEFAULT_CONFIG },
    cards: {}, // id -> card
    log: [], // { id, grade, ts, ms }
    daily: {}, // 'YYYY-MM-DD' -> { new: n, reviews: n }
    checkups: [], // прогоны экспресс-проверки: { ts, results: { cardId: 'know'|'weak'|'no' } }
    quizAttempts: [], // попытки мини-тестов: { ts, topic, total, correct, results }
    game: emptyGame(), // опыт, серия, достижения
    reading: { marks: {}, awarded: {} }, // прочитанные разделы конспектов
    shop: emptyShop(), // купленные украшения сцены
    schedule: { done: {} }, // шаги расписания, закрытые руками: id -> когда
  }
}

/** Read every data/seed/*.json bundle and flatten it into card objects. */
function readSeeds() {
  if (!fs.existsSync(SEED_DIR)) return []
  const out = []
  for (const file of fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json')).sort()) {
    let bundle
    try {
      bundle = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf8'))
    } catch (err) {
      console.error(`[seed] пропускаю ${file}: ${err.message}`)
      continue
    }
    for (const card of bundle.cards ?? []) {
      out.push({
        id: card.id,
        topic: bundle.topic,
        topicTitle: bundle.title ?? bundle.topic,
        question: card.q,
        answer: card.a,
        // Дословная реплика интервьюера — есть только у вопросов верхнего уровня
        asked: card.asked ?? null,
        tags: card.tags ?? [],
        level: card.level ?? 'middle',
        // Бандл может быть переработкой собственных конспектов — тогда карточки
        // получают цвет «из конспектов» и ссылку на исходный файл.
        source: bundle.source === 'notes' ? 'notes' : 'generated',
        sourceFile: card.sourceFile ?? bundle.sourceFile ?? null,
        createdAt: null,
      })
    }
  }
  return out
}

export function newSrs() {
  return { due: null, interval: 0, ease: 2.5, reps: 0, lapses: 0, lastReview: null, state: 'new' }
}

function load() {
  backupOnBoot()
  if (fs.existsSync(DB_FILE)) {
    try {
      db = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
      db.config = { ...DEFAULT_CONFIG, ...db.config }
      // Мерж поверхностный только на верхнем уровне не годится: у вложенных
      // объектов при добавлении новых полей появлялись бы дыры и NaN в счётчиках.
      const base = emptyGame()
      const saved = db.game ?? {}
      db.game = {
        ...base,
        ...saved,
        daily: { ...base.daily, ...(saved.daily ?? {}) },
        streak: { ...base.streak, ...(saved.streak ?? {}) },
        stats: { ...base.stats, ...(saved.stats ?? {}) },
        achievements: { ...(saved.achievements ?? {}) },
      }
      db.reading = { marks: {}, awarded: {}, ...(db.reading ?? {}) }
      db.shop = { ...emptyShop(), ...(db.shop ?? {}) }
    } catch (err) {
      const backup = `${DB_FILE}.broken-${Date.now()}`
      fs.renameSync(DB_FILE, backup)
      console.error(`[db] файл повреждён (${err.message}), сохранён как ${backup}, начинаю с нуля`)
      db = emptyDb()
    }
  } else {
    db = emptyDb()
  }

  // Seed cards are content, progress lives in the card's srs — so re-syncing on
  // every boot picks up new/edited seed cards without touching what you've learnt.
  for (const seed of readSeeds()) {
    const existing = db.cards[seed.id]
    if (!existing) {
      db.cards[seed.id] = { ...seed, srs: newSrs(), createdAt: new Date().toISOString() }
    } else if (!existing.edited) {
      Object.assign(existing, {
        topic: seed.topic,
        topicTitle: seed.topicTitle,
        question: seed.question,
        answer: seed.answer,
        asked: seed.asked,
        tags: seed.tags,
        level: seed.level,
      })
    }
  }
  persist()
  return db
}

export function getDb() {
  if (!db) load()
  return db
}

const TMP_FILE = `${DB_FILE}.tmp`
const MAX_WAIT = 2000 // дольше этого отложенная запись ждать не должна
let pendingSince = 0

/**
 * Атомарная запись: пишем во временный файл и подменяем им основной.
 * Прямая запись в db.json оставила бы обрубок, если процесс убьют посреди неё.
 */
function writeNow() {
  clearTimeout(writeTimer)
  writeTimer = null
  pendingSince = 0
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2))
  fs.renameSync(TMP_FILE, DB_FILE)
}

export function persist() {
  if (!pendingSince) pendingSince = Date.now()
  // Без верхнего предела частые действия подряд откладывали бы запись бесконечно:
  // каждый вызов сбрасывал таймер, и на диск не попадало вообще ничего.
  if (Date.now() - pendingSince >= MAX_WAIT) {
    writeNow()
    return
  }
  clearTimeout(writeTimer)
  writeTimer = setTimeout(writeNow, 150)
}

export function persistNow() {
  if (db) writeNow()
}

/**
 * Сброс на диск перед выходом. «Завершить» из дока присылает SIGTERM в
 * произвольный момент — без этого терялось всё, что не успел записать таймер.
 */
export function flushOnExit() {
  let done = false
  const flush = (exitAfter) => {
    if (!done) {
      done = true
      try {
        if (db && (writeTimer || pendingSince)) writeNow()
      } catch (err) {
        console.error('[db] не удалось сохранить перед выходом:', err.message)
      }
    }
    if (exitAfter) process.exit(0)
  }
  process.on('SIGTERM', () => flush(true))
  process.on('SIGINT', () => flush(true))
  process.on('exit', () => flush(false))
}
