/**
 * Яндекс Метрика — только в публичной демо-сборке и только если задан номер
 * счётчика (VITE_METRIKA_ID при сборке). Локальные занятия не считаются.
 *
 * Вебвизор выключен: для портфолио достаточно числа посетителей, возвратов и
 * источников — метки utm_source в ссылке Метрика разбирает сама.
 */
export const METRIKA_ID = import.meta.env.MODE === 'demo' ? Number(import.meta.env.VITE_METRIKA_ID) || 0 : 0

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[][]; l?: number }

export function startMetrika() {
  if (!METRIKA_ID) return
  const w = window as unknown as { ym?: Ym }
  const ym: Ym = (...args) => {
    ;(ym.a ??= []).push(args)
  }
  ym.l = Date.now()
  w.ym = ym
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://mc.yandex.ru/metrika/tag.js'
  document.head.appendChild(script)
  ym(METRIKA_ID, 'init', { clickmap: false, trackLinks: true, accurateTrackBounce: true, webvisor: false })
}

/** Переход внутри приложения: маршруты на хэше, сама Метрика их не видит. */
export function trackPage(path: string) {
  if (!METRIKA_ID) return
  const w = window as unknown as { ym?: Ym }
  w.ym?.(METRIKA_ID, 'hit', `${location.pathname}${location.search}#${path}`)
}
