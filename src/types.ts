export type Grade = 0 | 1 | 2 | 3
export type SrsState = 'new' | 'learning' | 'review' | 'relearning'
export type Source = 'generated' | 'notes' | 'manual'
export type Level = 'junior' | 'middle' | 'senior'

export interface Srs {
  due: string | null
  interval: number
  ease: number
  reps: number
  lapses: number
  lastReview: string | null
  state: SrsState
  step?: number
}

export interface Card {
  id: string
  topic: string
  topicTitle: string
  question: string
  answer: string
  /** Дословная реплика интервьюера — только у вопросов ревьюера. */
  asked?: string | null
  tags: string[]
  level: Level
  source: Source
  sourceFile: string | null
  createdAt: string | null
  edited?: boolean
  suspended?: boolean
  /** Место карточки в программе подготовки. Считает сервер, в базе не хранится. */
  scope?: Scope
  /** Создана из самопроверки по карточке конспекта: «файл#раздел|заголовок». */
  selfcheck?: string
  srs: Srs
}

/** core — пункт из списка работодателя, adjacent — рядом с ним, out — вне списка. */
export type Scope = 'core' | 'adjacent' | 'out'

export interface Config {
  notesDir: string
  newPerDay: number
  maxReviewsPerDay: number
  theme: string
  /** Ежедневная очередь только по программе подготовки. */
  focus?: boolean
}

export interface QueueResponse {
  queue: string[]
  counts: { due: number; learning: number; new: number; newTotal: number }
  /** Очередь собрана только из программы подготовки. */
  focused?: boolean
}

export interface TopicStat {
  topic: string
  title: string
  total: number
  new: number
  learning: number
  review: number
  mature: number
}

export interface Stats {
  byTopic: TopicStat[]
  retention: number | null
  daily: Record<string, { new: number; reviews: number }>
  weakest: { id: string; question: string; topic: string; lapses: number; ease: number }[]
  total: number
}

export type Verdict = 'know' | 'weak' | 'no'

export interface Checkup {
  ts: number
  total: number
  know: number
  weak: number
  no: number
  results: Record<string, Verdict>
}

export type QuizKind = 'single' | 'multi'

export interface QuizOption {
  t: string
  ok: boolean
}

export interface QuizQuestion {
  id: string
  kind: QuizKind
  question: string
  options: QuizOption[]
  /** Подробное обоснование — раскрывается в аккордеоне на результатах. */
  why: string
  /** id связанной карточки, чтобы уйти к полному разбору. */
  card: string | null
  topic: string
}

export interface QuizBundle {
  topic: string
  title: string
  questions: QuizQuestion[]
}

export interface QuizAttempt {
  ts: number
  topic: string
  total: number
  correct: number
  results: Record<string, boolean>
}

export interface NoteFile {
  rel: string
  folder: string
  name: string
  title: string
  size: number
  mtime: number
}

export interface NoteSection {
  index: number
  level: number
  title: string
  line: number
  body: string
}

// ------------------------------------------------------------ восхождение

export interface LevelInfo {
  level: number
  title: string
  xpInto: number
  xpNeeded: number
  nextTitle: string | null
}

export interface Unlocked {
  id: string
  title: string
  hint: string
  group: string
}

/** Что вернул сервер после начисления опыта — это и показываем всплывашкой. */
export interface Reward {
  gained: number
  xp: number
  mana: number
  manaTotal: number
  /** Доплата маны за длину серии — начисляется вместе с закрытой целью. */
  streakBonus: number
  notes: string[]
  goalJustMet: boolean
  levelUp: LevelInfo | null
  unlocked: Unlocked[]
}

export interface GameState {
  xp: number
  /** Валюта магазина. Копится параллельно опыту, но за другое — см. server/shop.mjs. */
  mana: number
  manaEarned: number
  streak: { current: number; best: number; lastGoalDay: string | null; freezes: number }
  daily: { goal: number; day: string; cards: number; reads: number; met: boolean }
  achievements: Record<string, number>
  stats: Record<string, number>
}

export interface Achievement extends Unlocked {
  secret: boolean
  unlockedAt: number | null
}

export interface PeakProgress {
  topic: string
  title: string
  /** Тема из собственных конспектов, а не из готовой базы. */
  kb: boolean
  total: number
  seen: number
  mastered: number
  bestQuiz: number | null
}

export interface ReadingCoverage {
  rel: string
  name: string
  title: string
  total: number
  read: number
  /** Карточек прочитано и всего — единица чтения теперь карточка, а не раздел. */
  cardsRead: number
  cardsTotal: number
  /** Объём в знаках: карточки различаются в десятки раз, счёт по ним врёт. */
  charsRead: number
  charsTotal: number
}

export interface ReadingState {
  marks: Record<string, { ts: number; title: string }>
  coverage: ReadingCoverage[]
  totals: { read: number; total: number; charsRead: number; charsTotal: number; filesDone: number }
}

export interface GameResponse {
  game: GameState
  level: LevelInfo
  /** Прогресс дня с учётом ограниченного вклада чтения. */
  progress: { cards: number; reads: number; readCap: number; total: number }
  reading: { read: number; total: number; charsRead: number; charsTotal: number; files: ReadingCoverage[] }
  topics: PeakProgress[]
  achievements: Achievement[]
  context: { topicsTotal: number; topicsCleared: number; quizTopicsDone: number; quizTopicsTotal: number }
  decor: Decor
}

/** Что нарисовано на сцене: включённые предметы и надетый ошейник. */
export interface Decor {
  items: string[]
  collar: string | null
}

export interface ShopItem {
  id: string
  title: string
  hint: string
  price: number
  group: string
  slot?: 'collar'
  requires?: string
  owned: boolean
  active: boolean
  locked: boolean
  affordable: boolean
}

export interface ShopState {
  mana: number
  earned: number
  items: ShopItem[]
}

/** Карточка конспекта — единица чтения размером примерно с экран. */
export interface NoteCard {
  index: number
  title: string
  level: number | null
  kind: string
  /** Номер раздела «## N.», внутри которого лежит карточка. */
  group: number | null
  body: string
  /** Вопрос для самопроверки, если он написан (data/selfcheck). */
  check?: { q: string; a: string }
}

/** Описание файла: о чём он и откуда взят материал. Не учебная карточка. */
export interface NoteIntro {
  lead: string
  rest: string
}

/** Раздел «## N.»: его карточки и вопросы, сделанные из него. */
export interface NoteGroup {
  group: number
  cardIndexes: number[]
  cardIds: string[]
}

// ------------------------------------------------------------ программа

export type TopicStatus = 'gap' | 'todo' | 'progress' | 'done'

/** Что делать дальше по пункту: дочитать раздел или ответить на карточки. */
export type ProgramStep =
  | { kind: 'read'; rel: string; group: number; title: string }
  | { kind: 'cards'; left: number }

export interface ProgramTopic {
  id: string
  title: string
  detail: string
  /** Почему тема оказалась рядом со списком — только у соседних. */
  why: string
  cards: { total: number; seen: number; solid: number }
  reading: { charsTotal: number; charsRead: number; sections: number; sectionsRead: number }
  notes: { rel: string; file: string; group: number; title: string; done: boolean }[]
  quiz: { topic: string; title: string; best: number | null }[]
  progress: number
  status: TopicStatus
  next: ProgramStep | null
}

export interface ProgramBlock {
  id: string
  title: string
  note: string
  topics: ProgramTopic[]
  progress: number
}

export interface Program {
  id: string
  company: string
  title: string
  /** Подписи: пункт меню, заголовок страницы, короткое имя списка и раздел книг. */
  nav: string
  /** Подпись под названием приложения: «React · Vue · общие темы». */
  brand: string
  heading: string
  /** «программа», «список тем» — для переключателя фокуса и подсказок. */
  listName: string
  resourcesTitle: string
  resourcesNote: string
  /** Откуда список тем. Ссылки нет, если список собран вручную. */
  source: { title: string; url?: string; checked: string }
  rule: string
  resources: { title: string; kind: string; url?: string }[]
  focus: boolean
  /** Средняя готовность по пунктам списка, 0..1. Соседние темы сюда не входят. */
  readiness: number
  topicsTotal: number
  topicsDone: number
  gaps: number
  blocks: ProgramBlock[]
  adjacent: ProgramBlock | null
  out: {
    title: string
    note: string
    cards: number
    decks: { topic: string; title: string; total: number }[]
    files: { rel: string; title: string }[]
  }
  scopes: Record<Scope, number>
  fileScope: Record<string, Scope>
  next: ({ block: string; topicId: string; topic: string } & ProgramStep) | null
  /** Расписание по дням до собеседования. Старый сервер его не присылает. */
  schedule?: Schedule | null
}

export interface ScheduleStep {
  id: string
  kind: 'quiz' | 'read' | 'cards' | 'review' | 'manual'
  title: string
  hint: string
  minutes: number
  /** Необязательный шаг: день закрывается и без него. */
  optional: boolean
  done: boolean
  /** Закрылся сам, по данным. Такой шаг руками не открыть. */
  auto: boolean
  manual: boolean
  progress: { done: number; total: number; unit: 'sections' | 'cards' } | null
  /** Итог, когда шаг закрыт: процент теста, число повторений. */
  result: string | null
  link: string | null
  action: string | null
}

export interface ScheduleDay {
  date: string
  title: string
  note: string
  /** Утро перед собеседованием: вчерашние долги сюда не подтягиваются. */
  fresh: boolean
  state: 'past' | 'today' | 'future'
  steps: ScheduleStep[]
  total: number
  done: number
  minutesLeft: number
}

export interface Schedule {
  title: string
  deadline: string
  /** Подпись отсчёта: «до собеседования» или «до конца подготовки». */
  deadlineLabel: string
  /** Срок прошёл: расписание показывается как итог и никуда не зовёт. */
  over: boolean
  today: string
  days: ScheduleDay[]
  next: (ScheduleStep & { date: string; overdue: boolean }) | null
}
