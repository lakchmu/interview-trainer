/**
 * Заготовленный прогресс для первого визита в демо.
 *
 * Пустое приложение показывает мало: обзор без графиков, серия ноль, очередь из
 * одних новых карточек. Поэтому при первом входе «проживаются» две недели
 * занятий — через те же маршруты API, что и живые ответы, только со сдвинутыми
 * часами. Состояние получается настоящим: интервалы, серия, опыт и достижения
 * посчитаны самим приложением, а не нарисованы.
 */
type Router = {
  handle(
    method: string,
    pathname: string,
    request?: { query?: Record<string, string>; body?: unknown },
  ): { status: number; body: unknown }
}

const DAY = 24 * 60 * 60 * 1000
const DAYS = 14
/** День без занятий: тепловая карта неровная, как у живого человека. */
const SKIPPED = new Set([10])

/** Детерминированный генератор: у всех посетителей одинаковая история. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function seedProgress(router: Router) {
  const RealDate = Date
  let now = RealDate.now()
  class ShiftedDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      if (args.length === 0) super(now)
      else super(...(args as ConstructorParameters<typeof Date>))
    }
    static now() {
      return now
    }
  }
  const random = rng(42)
  const call = (method: string, path: string, body?: unknown, query?: Record<string, string>) =>
    router.handle(method, path, { body, query })

  globalThis.Date = ShiftedDate as DateConstructor
  try {
    const notes = (call('GET', '/api/notes').body as { files: { rel: string }[] }).files.map((f) => f.rel)
    let readCursor = 0

    for (let back = DAYS; back >= 1; back--) {
      if (SKIPPED.has(back)) continue
      // Вечер того дня, около семи
      const evening = new RealDate(RealDate.now() - back * DAY)
      evening.setHours(19, Math.floor(random() * 50), 0, 0)
      now = evening.getTime()

      // Карточки: сколько попросит очередь, но не больше 20–30 за вечер
      const limit = 20 + Math.floor(random() * 10)
      for (let i = 0; i < limit; i++) {
        const { queue } = call('GET', '/api/queue', undefined, { topics: '', sources: '', tags: '' }).body as {
          queue: string[]
        }
        if (!queue.length) break
        const r = random()
        // Как у живого человека: чаще «хорошо», иногда «снова»
        const grade = r < 0.12 ? 0 : r < 0.3 ? 1 : r < 0.9 ? 2 : 3
        call('POST', '/api/review', { id: queue[0], grade, ms: 8000 + Math.floor(random() * 30000) })
        now += 20_000 + Math.floor(random() * 40_000)
      }

      // Пара разделов конспектов через вечер
      if (back % 2 === 0 && notes.length) {
        const rel = notes[readCursor % notes.length]
        const reading = call('GET', '/api/notes/file', undefined, { rel }).body as { cards?: { title: string }[] }
        const cards = reading.cards ?? []
        for (let index = 0; index < Math.min(3, cards.length); index++) {
          call('POST', '/api/reading/toggle', { rel, index, title: cards[index].title })
        }
        readCursor++
      }

      // Пара мини-тестов, чтобы на обзоре была история попыток
      if (back === 6 || back === 2) {
        const total = 10
        const correct = back === 6 ? 6 : 8
        call('POST', '/api/quiz/attempt', { topic: back === 6 ? 'vue' : 'markup', total, correct, results: {} })
      }
    }
  } finally {
    globalThis.Date = RealDate
  }
}
