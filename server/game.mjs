/**
 * Игровой слой над подготовкой: опыт, уровни-высоты, серия дней и достижения.
 *
 * Главный принцип экономики: опыт даётся за ПОВТОРЕНИЕ, а не за поглощение
 * нового, и честный ответ «не знаю» приносит опыт наравне с верным. Иначе игра
 * начинает поощрять враньё самому себе — а на нём вся диагностика ломается.
 */

export const LEVELS = [
  { xp: 0, title: 'Базовый лагерь' },
  { xp: 120, title: 'Первый переход' },
  { xp: 300, title: 'Тропа' },
  { xp: 560, title: 'Лесная зона' },
  { xp: 900, title: 'Скальный пояс' },
  { xp: 1350, title: 'Гребень' },
  { xp: 1900, title: 'Снежная линия' },
  { xp: 2600, title: 'Ледник' },
  { xp: 3500, title: 'Разреженный воздух' },
  { xp: 4600, title: 'Штурмовой лагерь' },
  { xp: 6000, title: 'Предвершинный взлёт' },
  { xp: 7800, title: 'Карниз' },
  { xp: 10000, title: 'Вершина' },
  { xp: 13000, title: 'Траверс' },
  { xp: 17000, title: 'Проводник' },
]

export const XP = {
  cardNew: 3,
  cardAgain: 3, // «снова» — тоже опыт: честность не наказывается
  cardOk: 6, // повторение дороже новой карточки — так задумано
  mastered: 25, // карточка ушла на интервал 21+ дней
  quizRight: 5,
  quizWrong: 1, // ошибка с разбором тоже чему-то научила
  quizGood: 50, // тест от 80%
  quizPerfect: 100,
  checkupAnswer: 3,
  dailyGoal: 40,
  readCard: 1, // за каждую прочитанную карточку конспекта
  readFile: 30, // весь файл разведан
  sectionCheck: 20, // вспомнила прочитанное сразу после чтения
  noteToCard: 8, // раздел превращён в карточку — вот за это платим щедро
}

/**
 * Мана — валюта магазина украшений. Начисляется ПАРАЛЛЕЛЬНО опыту, но за другое.
 *
 * Опыт измеряет весь вложенный труд, включая чтение. Мана — только извлечение
 * из памяти и закрытый день. За чтение маны нет намеренно: иначе самым дешёвым
 * путём к покупкам стало бы «пролистать и отметить прочитанным».
 *
 * Основной источник — закрытая дневная цель, а не отдельные действия: магазин
 * должен окупать регулярность, потому что именно она и не даётся.
 */
export const MANA = {
  card: 1, // любой разбор карточки, включая честное «снова»
  readCard: 1, // за каждую прочитанную карточку — РАЗОВО, повторная отметка не платит
  readFile: 12, // файл разведан целиком
  sectionCheck: 8, // проверка себя сразу после раздела — вот ради чего всё
  sectionPerfect: 5, // сверху, если вспомнила всё
  mastered: 5,
  quizGood: 8, // тест от 80%
  quizPerfect: 15,
  checkup: 12, // пройденная проверка на вопросах ревьюера
  noteToCard: 2, // за каждую карточку, сделанную из конспекта
  dailyGoal: 25, // главный источник
  streakDay: 3, // × длина серии — постоянство накапливается
  streakCap: 7, // но не больше семи дней, иначе цифры разъезжаются
}

/**
 * Какую долю дневной цели можно закрыть чтением.
 *
 * Изначально была треть — из принципа «извлечение важнее перечитывания». Для
 * первого прохода это неверно: пока материал не прочитан ни разу, извлекать
 * нечего, и потолок бил ровно по той работе, которая сейчас единственно
 * возможна. Половина — компромисс: день всё ещё нельзя закрыть одним чтением,
 * но и наказания за первый проход больше нет.
 */
export const READ_SHARE = 1 / 2

export function levelOf(xp) {
  let index = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  return {
    level: index + 1,
    title: current.title,
    xpInto: xp - current.xp,
    xpNeeded: next ? next.xp - current.xp : 0,
    nextTitle: next?.title ?? null,
  }
}

/**
 * Достижения. `check` получает состояние игры и контекст события.
 * `secret: true` — не показываем условие заранее, только факт получения.
 */
export const ACHIEVEMENTS = [
  { id: 'first-card', title: 'Вышла на тропу', hint: 'Разобрать первую карточку', group: 'Начало',
    check: (g) => g.stats.reviews >= 1 },
  { id: 'first-quiz', title: 'Проверка снаряжения', hint: 'Пройти первый мини-тест', group: 'Начало',
    check: (g) => g.stats.quizAttempts >= 1 },
  { id: 'first-checkup', title: 'Взгляд на маршрут', hint: 'Пройти экспресс-проверку уровня', group: 'Начало',
    check: (g) => g.stats.checkups >= 1 },

  { id: 'reviews-50', title: 'Первая полусотня', hint: '50 разборов карточек', group: 'Объём',
    check: (g) => g.stats.reviews >= 50 },
  { id: 'reviews-200', title: 'Втянулась', hint: '200 разборов карточек', group: 'Объём',
    check: (g) => g.stats.reviews >= 200 },
  { id: 'reviews-500', title: 'Рабочая лошадка', hint: '500 разборов карточек', group: 'Объём',
    check: (g) => g.stats.reviews >= 500 },
  { id: 'reviews-1000', title: 'Тысячник', hint: '1000 разборов карточек', group: 'Объём',
    check: (g) => g.stats.reviews >= 1000 },

  { id: 'mastered-25', title: 'Осело', hint: '25 карточек выучены надолго', group: 'Память',
    check: (g) => g.stats.mastered >= 25 },
  { id: 'mastered-100', title: 'Фундамент', hint: '100 карточек выучены надолго', group: 'Память',
    check: (g) => g.stats.mastered >= 100 },
  { id: 'mastered-250', title: 'Половина горы', hint: '250 карточек выучены надолго', group: 'Память',
    check: (g) => g.stats.mastered >= 250 },

  { id: 'streak-3', title: 'Три дня подряд', hint: 'Серия из 3 дней', group: 'Постоянство',
    check: (g) => g.streak.best >= 3 },
  { id: 'streak-7', title: 'Неделя', hint: 'Серия из 7 дней', group: 'Постоянство',
    check: (g) => g.streak.best >= 7 },
  { id: 'streak-14', title: 'Две недели', hint: 'Серия из 14 дней', group: 'Постоянство',
    check: (g) => g.streak.best >= 14 },
  { id: 'streak-30', title: 'Месяц на маршруте', hint: 'Серия из 30 дней', group: 'Постоянство',
    check: (g) => g.streak.best >= 30 },

  { id: 'quiz-good', title: 'Фактура держится', hint: 'Пройти мини-тест на 80% и выше', group: 'Тесты',
    check: (g) => g.stats.quizGood >= 1 },
  { id: 'quiz-perfect', title: 'Без единой ошибки', hint: 'Пройти мини-тест на 100%', group: 'Тесты',
    check: (g) => g.stats.quizPerfect >= 1 },
  { id: 'quiz-all', title: 'Все разделы пройдены', hint: 'Пройти мини-тест каждого раздела', group: 'Тесты',
    check: (g, ctx) => (ctx.quizTopicsDone ?? 0) >= (ctx.quizTopicsTotal ?? 99) },
  { id: 'combo-10', title: 'Серия из десяти', hint: '10 верных ответов подряд в тесте', group: 'Тесты',
    check: (g) => g.stats.bestCombo >= 10 },
  { id: 'combo-20', title: 'Не сбиться', hint: '20 верных ответов подряд в тесте', group: 'Тесты',
    check: (g) => g.stats.bestCombo >= 20 },

  { id: 'voice-10', title: 'Голос прорезался', hint: '10 вопросов ревьюера с ответом «отвечу уверенно»', group: 'Устно',
    check: (g) => g.stats.confident >= 10 },
  { id: 'voice-30', title: 'Держу разговор', hint: '30 вопросов ревьюера уверенно', group: 'Устно',
    check: (g) => g.stats.confident >= 30 },
  { id: 'voice-all', title: 'Готова к разговору', hint: 'Все 56 вопросов ревьюера уверенно', group: 'Устно',
    check: (g) => g.stats.confident >= 56 },

  { id: 'topic-first', title: 'Первая вершина', hint: 'Закрыть тему: все карточки вышли на повторение', group: 'Вершины',
    check: (g, ctx) => (ctx.topicsCleared ?? 0) >= 1 },
  { id: 'topic-half', title: 'Полпути', hint: 'Закрыть половину тем', group: 'Вершины',
    check: (g, ctx) => (ctx.topicsCleared ?? 0) >= Math.ceil((ctx.topicsTotal ?? 99) / 2) },
  { id: 'topic-all', title: 'Все вершины взяты', hint: 'Закрыть все темы', group: 'Вершины',
    check: (g, ctx) => ctx.topicsTotal > 0 && (ctx.topicsCleared ?? 0) >= ctx.topicsTotal },

  { id: 'day-goal-first', title: 'Первый закрытый день', hint: 'Выполнить дневную цель', group: 'Ритм',
    check: (g) => g.stats.goalsMet >= 1 },
  { id: 'day-goal-10', title: 'Десять закрытых дней', hint: 'Выполнить дневную цель 10 раз', group: 'Ритм',
    check: (g) => g.stats.goalsMet >= 10 },
  { id: 'double-goal', title: 'Сверх плана', hint: 'Сделать двойную дневную норму', group: 'Ритм',
    check: (g) => (g.daily.cards ?? 0) >= g.daily.goal * 2 },

  { id: 'scout-first', title: 'Первая вылазка', hint: 'Прочитать первый раздел конспекта', group: 'Разведка',
    check: (g) => g.stats.sectionsRead >= 1 },
  { id: 'scout-50', title: 'Разведчик', hint: '50 разделов конспекта прочитано', group: 'Разведка',
    check: (g) => g.stats.sectionsRead >= 50 },
  { id: 'scout-200', title: 'Знаю тропы', hint: '200 разделов конспекта прочитано', group: 'Разведка',
    check: (g) => g.stats.sectionsRead >= 200 },
  { id: 'scout-file', title: 'Картограф', hint: 'Прочитать конспект целиком — весь файл', group: 'Разведка',
    check: (g) => g.stats.filesRead >= 1 },
  { id: 'scout-all-files', title: 'Маршрут размечен', hint: 'Прочитать все файлы конспектов', group: 'Разведка',
    check: (g, ctx) => (ctx.noteFilesTotal ?? 0) > 0 && g.stats.filesRead >= ctx.noteFilesTotal },
  { id: 'recall-first', title: 'Проверила себя', hint: 'Впервые вспомнить раздел сразу после чтения', group: 'Разведка',
    check: (g) => (g.stats.sectionChecks ?? 0) >= 1 },
  { id: 'recall-25', title: 'Читаю и удерживаю', hint: '25 разделов с проверкой сразу после чтения', group: 'Разведка',
    check: (g) => (g.stats.sectionChecks ?? 0) >= 25 },
  { id: 'recall-all', title: 'Первый проход закрыт', hint: 'Проверить себя по всем 58 разделам конспектов', group: 'Разведка',
    check: (g) => (g.stats.sectionChecks ?? 0) >= 58 },
  { id: 'recall-perfect', title: 'Ничего не потеряла', hint: '10 разделов вспомнены целиком, без единого промаха', group: 'Разведка',
    check: (g) => (g.stats.sectionsPerfect ?? 0) >= 10 },
  { id: 'note-to-card', title: 'Не просто читала', hint: '10 карточек сделано из конспектов', group: 'Разведка',
    check: (g) => g.stats.notesToCards >= 10 },

  { id: 'first-buy', title: 'Первая трата', hint: 'Купить что-нибудь в магазине', group: 'Магазин',
    check: (g) => (g.stats.purchases ?? 0) >= 1 },
  { id: 'good-dog', title: 'Хорошая девочка', hint: 'Завести корги', group: 'Магазин',
    check: (g, ctx) => !!ctx.owned?.corgi },
  { id: 'wardrobe', title: 'Гардероб', hint: 'Собрать все ошейники для корги', group: 'Магазин',
    check: (g, ctx) => (ctx.collarsTotal ?? 0) > 0 && (ctx.collarsOwned ?? 0) >= ctx.collarsTotal },
  { id: 'mana-500', title: 'Есть на что тратить', hint: 'Заработать 500 маны за всё время', group: 'Магазин',
    check: (g) => (g.manaEarned ?? 0) >= 500 },

  { id: 'early-bird', title: 'Ранняя пташка', hint: 'Заниматься до 7 утра', group: 'Скрытые', secret: true,
    check: (g, ctx) => ctx.hour !== undefined && ctx.hour < 7 },
  { id: 'night-owl', title: 'Сова', hint: 'Заниматься после полуночи', group: 'Скрытые', secret: true,
    check: (g, ctx) => ctx.hour !== undefined && ctx.hour >= 0 && ctx.hour < 4 },
  { id: 'comeback', title: 'Вернулась', hint: 'Продолжить после перерыва в 3+ дня', group: 'Скрытые', secret: true,
    check: (g) => g.stats.comebacks >= 1 },
  { id: 'honest', title: 'Честный маршрут', hint: 'Признать «не отвечу» 20 раз — самооценка без обмана', group: 'Скрытые', secret: true,
    check: (g) => g.stats.admitted >= 20 },
]

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10)

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000)
}

export function emptyGame() {
  return {
    xp: 0,
    mana: 0,
    manaEarned: 0, // всего заработано за всё время — для статистики магазина
    streak: { current: 0, best: 0, lastGoalDay: null, freezes: 2 },
    daily: { goal: 12, day: dayKey(), cards: 0, reads: 0, met: false },
    achievements: {},
    stats: {
      reviews: 0, mastered: 0, quizAttempts: 0, quizGood: 0, quizPerfect: 0,
      bestCombo: 0, checkups: 0, confident: 0, admitted: 0, goalsMet: 0, comebacks: 0,
      sectionsRead: 0, filesRead: 0, notesToCards: 0, purchases: 0,
      sectionChecks: 0, sectionsPerfect: 0,
    },
  }
}

/**
 * Прогресс дня. Чтение засчитывается, но не больше трети цели: закрыть день
 * одним чтением нельзя — иначе игра начнёт уводить в пассивную активность.
 */
export function dailyProgress(daily) {
  const readCap = Math.max(1, Math.floor(daily.goal * READ_SHARE))
  return {
    cards: daily.cards ?? 0,
    reads: Math.min(daily.reads ?? 0, readCap),
    readCap,
    total: (daily.cards ?? 0) + Math.min(daily.reads ?? 0, readCap),
  }
}

/** Смена суток: сбрасываем дневной счётчик и пересчитываем серию. */
function rollDay(game, today) {
  if (game.daily.day === today) return
  const last = game.streak.lastGoalDay
  if (last) {
    const gap = daysBetween(last, today)
    if (gap >= 2) {
      const missed = gap - 1
      if (game.streak.freezes >= missed) {
        game.streak.freezes -= missed // серия выживает за счёт заморозок
      } else {
        if (gap > 3) game.stats.comebacks += 1
        game.streak.current = 0
      }
    }
  }
  game.daily = { goal: game.daily.goal, day: today, cards: 0, reads: 0, met: false }
}

/**
 * Выдаёт всё, что уже заслужено, и возвращает только что открытое.
 * Вынесено из award, потому что покупка в магазине тоже может открыть достижение,
 * а опыта при этом не начисляет.
 */
export function checkAchievements(game, ctx = {}) {
  const unlocked = []
  for (const a of ACHIEVEMENTS) {
    if (game.achievements[a.id]) continue
    let ok = false
    try {
      ok = a.check(game, ctx)
    } catch {
      ok = false
    }
    if (ok) {
      game.achievements[a.id] = Date.now()
      unlocked.push({ id: a.id, title: a.title, hint: a.hint, group: a.group })
    }
  }
  return unlocked
}

/**
 * Начисляет опыт за событие и возвращает всё, что стоит показать пользователю.
 * event: { type, ... }
 */
export function award(game, event, ctx = {}) {
  const now = new Date()
  const today = dayKey(now)
  rollDay(game, today)

  const before = levelOf(game.xp)
  let gained = 0
  let mana = 0
  const notes = []

  if (event.type === 'review') {
    game.stats.reviews += 1
    game.daily.cards += 1
    if (event.wasNew) gained += XP.cardNew
    else gained += event.grade === 0 ? XP.cardAgain : XP.cardOk
    mana += MANA.card
    if (event.becameMastered) {
      game.stats.mastered += 1
      gained += XP.mastered
      mana += MANA.mastered
      notes.push('карточка выучена надолго')
    }
  }

  if (event.type === 'read') {
    game.stats.sectionsRead += 1
    game.daily.reads += 1
    gained += XP.readCard
    // Начисляется за каждую карточку, отмеченную ВПЕРВЫЕ: award зовётся один
    // раз на карточку за всё время, поэтому снять и поставить галочку заново
    // ничего не приносит. Мелкий шаг — это и есть смысл: отдача на каждом куске,
    // а не одна выплата в конце длинного раздела.
    mana += MANA.readCard
    if (event.fileDone) {
      game.stats.filesRead += 1
      gained += XP.readFile
      mana += MANA.readFile
      notes.push('файл конспекта разведан целиком')
    }
  }

  // Проверка сразу после прочитанного раздела. Сами карточки уже оплачены
  // обычным разбором — здесь платим за то, что она вообще состоялась.
  if (event.type === 'sectionCheck') {
    game.stats.sectionChecks = (game.stats.sectionChecks ?? 0) + 1
    gained += XP.sectionCheck
    mana += MANA.sectionCheck
    if (event.recalled >= event.total && event.total > 0) {
      game.stats.sectionsPerfect = (game.stats.sectionsPerfect ?? 0) + 1
      mana += MANA.sectionPerfect
      notes.push('раздел удержан целиком')
    }
  }

  if (event.type === 'noteToCard') {
    game.stats.notesToCards += event.count ?? 1
    gained += XP.noteToCard * (event.count ?? 1)
    mana += MANA.noteToCard * (event.count ?? 1)
    notes.push('из конспекта сделаны карточки')
  }

  if (event.type === 'quiz') {
    game.stats.quizAttempts += 1
    const percent = Math.round((event.correct / event.total) * 100)
    gained += event.correct * XP.quizRight + (event.total - event.correct) * XP.quizWrong
    if (event.bestCombo > game.stats.bestCombo) game.stats.bestCombo = event.bestCombo
    if (percent === 100) {
      game.stats.quizPerfect += 1
      game.stats.quizGood += 1
      gained += XP.quizPerfect
      mana += MANA.quizPerfect
      notes.push('тест без единой ошибки')
    } else if (percent >= 80) {
      game.stats.quizGood += 1
      gained += XP.quizGood
      mana += MANA.quizGood
      notes.push('тест сдан')
    }
  }

  if (event.type === 'checkup') {
    game.stats.checkups += 1
    game.stats.confident = Math.max(game.stats.confident, event.know ?? 0)
    game.stats.admitted += event.no ?? 0
    gained += (event.total ?? 0) * XP.checkupAnswer
    mana += MANA.checkup
  }

  // дневная цель закрывается один раз в сутки
  let goalJustMet = false
  let streakBonus = 0
  if (!game.daily.met && dailyProgress(game.daily).total >= game.daily.goal) {
    game.daily.met = true
    goalJustMet = true
    game.stats.goalsMet += 1
    gained += XP.dailyGoal
    mana += MANA.dailyGoal

    const last = game.streak.lastGoalDay
    game.streak.current = last && daysBetween(last, today) === 1 ? game.streak.current + 1 : 1
    game.streak.lastGoalDay = today
    if (game.streak.current > game.streak.best) game.streak.best = game.streak.current
    // каждые 7 дней серии возвращаем одну заморозку, максимум три
    if (game.streak.current % 7 === 0) game.streak.freezes = Math.min(3, game.streak.freezes + 1)
    // Бонус за серию считаем ПОСЛЕ её пересчёта, иначе первый день даст ноль.
    streakBonus = Math.min(game.streak.current, MANA.streakCap) * MANA.streakDay
    mana += streakBonus
  }

  game.xp += gained
  game.mana += mana
  game.manaEarned += mana
  const after = levelOf(game.xp)

  const unlocked = checkAchievements(game, { ...ctx, hour: now.getHours() })

  return {
    gained,
    xp: game.xp,
    mana,
    manaTotal: game.mana,
    streakBonus,
    notes,
    goalJustMet,
    levelUp: after.level > before.level ? after : null,
    unlocked,
  }
}
