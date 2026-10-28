import type {
  Card,
  Checkup,
  Config,
  Grade,
  NoteFile,
  NoteCard,
  NoteIntro,
  NoteGroup,
  NoteSection,
  QueueResponse,
  QuizAttempt,
  QuizBundle,
  GameResponse,
  Program,
  ReadingState,
  Reward,
  Unlocked,
  GameState,
  Decor,
  ShopItem,
  ShopState,
  Stats,
  Verdict,
} from './types'

/** Демо-сборка: сервера нет, те же маршруты выполняются в браузере (src/demo). */
export const DEMO = import.meta.env.MODE === 'demo'

type Transport = (url: string, init: RequestInit) => Promise<Response>
let transport: Transport = (url, init) => fetch(url, init)

/**
 * Подменить способ отправки запросов. Демо-сборка ставит сюда обработку прямо
 * в браузере — сам api.ts о демо ничего не знает, и в обычную сборку демо-код
 * не попадает.
 */
export function setTransport(next: Transport) {
  transport = next
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await transport(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.error ?? `Ошибка ${res.status}`)
  }
  return res.json()
}

const json = (body: unknown) => ({ body: JSON.stringify(body) })

export const api = {
  state: () => request<{ config: Config; cards: Card[]; daily: Stats['daily'] }>('/api/state'),
  stats: () => request<Stats>('/api/stats'),

  /** program — пункт программы подготовки; scope: 'all' снимает фокус на ней. */
  queue: (
    topics: string[],
    sources: string[],
    tags: string[] = [],
    extra: { program?: string; scope?: string } = {},
  ) =>
    request<QueueResponse>(
      `/api/queue?topics=${topics.join(',')}&sources=${sources.join(',')}&tags=${tags.join(',')}` +
        `&program=${encodeURIComponent(extra.program ?? '')}&scope=${extra.scope ?? ''}`,
    ),

  program: () => request<Program | null>('/api/program'),
  /** Закрыть шаг расписания руками или снять такую отметку. */
  programStep: (id: string, done: boolean) =>
    request<{ id: string; done: boolean }>('/api/program/step', { method: 'POST', ...json({ id, done }) }),

  review: (id: string, grade: Grade, ms: number) =>
    request<Card & { reward: Reward }>('/api/review', { method: 'POST', ...json({ id, grade, ms }) }),

  createCard: (card: Partial<Card>) => request<Card>('/api/cards', { method: 'POST', ...json(card) }),
  updateCard: (id: string, patch: Partial<Card>) =>
    request<Card>(`/api/cards/${id}`, { method: 'PUT', ...json(patch) }),
  deleteCard: (id: string) => request<{ ok: true }>(`/api/cards/${id}`, { method: 'DELETE' }),
  bulkCreate: (cards: Partial<Card>[]) =>
    request<{ created: number; cards: Card[]; reward: Reward | null }>('/api/cards/bulk', {
      method: 'POST',
      ...json({ cards }),
    }),

  suspend: (id: string) => request<Card>(`/api/cards/${id}/suspend`, { method: 'POST' }),
  resetCard: (id: string) => request<Card>(`/api/cards/${id}/reset`, { method: 'POST' }),
  resetProgress: (topic?: string) =>
    request<{ ok: true }>('/api/reset-progress', { method: 'POST', ...json({ topic }) }),

  setConfig: (patch: Partial<Config>) => request<Config>('/api/config', { method: 'PUT', ...json(patch) }),

  game: () => request<GameResponse>('/api/game'),
  reading: () => request<ReadingState>('/api/reading'),
  toggleRead: (rel: string, index: number, title: string) =>
    request<{ marked: boolean; reward: Reward | null; stale?: boolean }>('/api/reading/toggle', {
      method: 'POST',
      ...json({ rel, index, title }),
    }),
  setGoal: (goal: number) =>
    request<GameState['daily']>('/api/game/goal', { method: 'PUT', ...json({ goal }) }),

  shop: () => request<ShopState>('/api/shop'),
  buy: (id: string) =>
    request<{ bought: ShopItem; mana: number; items: ShopItem[]; decor: Decor; unlocked: Unlocked[] }>(
      '/api/shop/buy',
      { method: 'POST', ...json({ id }) },
    ),
  equip: (id: string, on: boolean) =>
    request<{ items: ShopItem[]; decor: Decor }>('/api/shop/equip', { method: 'POST', ...json({ id, on }) }),

  quiz: () => request<{ bundles: QuizBundle[]; attempts: QuizAttempt[] }>('/api/quiz'),
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'ts'> & { bestCombo: number }) =>
    request<QuizAttempt & { reward: Reward }>('/api/quiz/attempt', { method: 'POST', ...json(attempt) }),

  interview: () => request<{ questions: Card[]; checkups: Checkup[] }>('/api/interview'),
  saveCheckup: (results: Record<string, Verdict>) =>
    request<Checkup & { reward: Reward }>('/api/checkup', { method: 'POST', ...json({ results }) }),
  checkupToReview: (ids: string[]) =>
    request<{ reset: number }>('/api/checkup/to-review', { method: 'POST', ...json({ ids }) }),

  notes: () => request<{ dir: string; ok: boolean; bundled: boolean; files: NoteFile[] }>('/api/notes'),
  note: (rel: string) =>
    request<{
      rel: string
      content: string
      sections: NoteSection[]
      cards: NoteCard[]
      intro: NoteIntro | null
      groups: NoteGroup[]
      titles: Record<number, string>
    }>(`/api/notes/file?rel=${encodeURIComponent(rel)}`),
  /** Правка одной карточки конспекта. original — текст на момент открытия. */
  saveNoteCard: (rel: string, index: number, body: string, original: string) =>
    request<{
      cards: NoteCard[]
      intro: NoteIntro | null
      groups: NoteGroup[]
      titles: Record<number, string>
      marksMoved: number
      marksDropped: number
    }>('/api/notes/card', { method: 'PUT', ...json({ rel, index, body, original }) }),

  /** «Не вспомнила» в самопроверке: карточка уходит в повторение. */
  selfCheckMiss: (rel: string, group: number, title: string) =>
    request<{ card: Card; created: boolean }>('/api/notes/selfcheck/miss', {
      method: 'POST',
      ...json({ rel, group, title }),
    }),
  sectionCheck: (recalled: number, total: number) =>
    request<{ reward: Reward }>('/api/notes/section-check', {
      method: 'POST',
      ...json({ recalled, total }),
    }),
  searchNotes: (q: string) =>
    request<{ rel: string; title: string; line: number; excerpt: string }[]>(
      `/api/notes/search?q=${encodeURIComponent(q)}`,
    ),
  checkDir: (dir: string) =>
    request<{ ok: boolean; resolved?: string; count?: number; message: string }>(
      `/api/notes/check?dir=${encodeURIComponent(dir)}`,
    ),
}
