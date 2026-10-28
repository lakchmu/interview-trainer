/**
 * Демо-режим: API работает прямо в браузере.
 *
 * Маршруты те же, что у локального сервера (server/api.mjs): они собраны вместе
 * с приложением, а node:fs, node:path и node:url подменены (см. vite.config.ts).
 * Контент приходит публичным снимком demo-content.json, прогресс посетителя
 * хранится в IndexedDB его браузера — сервера и общей базы нет.
 */
import { mount, onWrite } from './node-fs'
import { clearAll, loadAll, saveAll } from './storage'
import { seedProgress } from './progress'

const ROOT = '/app/data'
const DB_FILE = `${ROOT}/db.json`

type Router = {
  handle(
    method: string,
    pathname: string,
    request: { query?: Record<string, string>; body?: unknown },
  ): { status: number; body: unknown }
}

let router: Router | null = null
let resetting = false
const pending = new Map<string, string | null>()
let flushTimer: ReturnType<typeof setTimeout> | undefined

function flush() {
  clearTimeout(flushTimer)
  if (resetting) return
  const batch = new Map(pending)
  pending.clear()
  void saveAll(batch)
}

export async function startDemo() {
  const [content, saved] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}demo-content.json`).then((r) => {
      if (!r.ok) throw new Error(`Не загрузился контент демо (${r.status})`)
      return r.json() as Promise<{ builtAt: number; files: Record<string, string> }>
    }),
    loadAll(),
  ])

  mount(Object.fromEntries(Object.entries(content.files).map(([rel, text]) => [`${ROOT}/${rel}`, text])), content.builtAt)
  mount(saved, Date.now())

  onWrite((path, text) => {
    // Временный файл атомарной записи живёт миллисекунды — хранить его незачем
    if (path.endsWith('.tmp')) return
    pending.set(path, text)
    clearTimeout(flushTimer)
    flushTimer = setTimeout(flush, 400)
  })
  addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Серверный код читает настройки из process.env. DB_FILE заодно отключает
  // снимки базы при запуске — в браузере они ни к чему.
  ;(globalThis as { process?: unknown }).process = {
    env: { PROGRAM: 'demo', DB_FILE, HOME: '/home' },
  }
  const api = (await import('../../server/api.mjs')) as { app: Router }
  router = api.app

  // Первый визит: база пустая — заполняем её двумя неделями занятий, чтобы
  // обзор, серия и расписание повторений были видны сразу
  if (!(DB_FILE in saved)) seedProgress(router)
  flush()
}

/** fetch для api.ts: тот же контракт, но запрос обрабатывается на месте. */
export async function demoFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!router) throw new Error('Демо ещё не запущено')
  const url = new URL(input, location.origin)
  const reply = router.handle((init?.method ?? 'GET').toUpperCase(), url.pathname, {
    query: Object.fromEntries(url.searchParams),
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
  })
  return new Response(JSON.stringify(reply.body ?? null), {
    status: reply.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Начать демо заново: стереть прогресс и пометки этого браузера. */
export async function resetDemo() {
  resetting = true
  clearTimeout(flushTimer)
  await clearAll()
  try {
    // Решённые задачи, самопроверка, положение в конспектах. Тема оформления
    // остаётся — это настройка, а не прогресс.
    for (const key of Object.keys(localStorage)) {
      if (key !== 'sky-settings') localStorage.removeItem(key)
    }
  } catch {
    // localStorage недоступен — стирать нечего
  }
  location.reload()
}
