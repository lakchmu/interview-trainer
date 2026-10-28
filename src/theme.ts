export type Phase = 'dawn' | 'day' | 'sunset' | 'dusk' | 'night'
export type Weather = 'clear' | 'rain' | 'snow'
export type Lightness = 'light' | 'dark'

export interface SkySettings {
  /** 'auto' — фаза считается от текущего времени. */
  mode: 'auto' | Phase
  /** 'auto' — погода детерминированно выбирается на каждый день. */
  weather: 'auto' | Weather
  /** Пейзаж можно выключить, оставив только палитру. */
  scenery: boolean
}

export const DEFAULT_SETTINGS: SkySettings = { mode: 'auto', weather: 'auto', scenery: true }

interface PhaseInfo {
  id: Phase
  label: string
  lightness: Lightness
  /** Час, на который «замирает» солнце, если фаза выбрана вручную. */
  refHour: number
}

export const PHASES: PhaseInfo[] = [
  { id: 'dawn', label: 'Рассвет', lightness: 'dark', refHour: 6.2 },
  { id: 'day', label: 'Солнечный день', lightness: 'light', refHour: 12.5 },
  { id: 'sunset', label: 'Закат', lightness: 'dark', refHour: 18.2 },
  { id: 'dusk', label: 'Сумерки', lightness: 'dark', refHour: 20.2 },
  { id: 'night', label: 'Ночь', lightness: 'dark', refHour: 23.5 },
]

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'Ясно',
  rain: 'Дождь',
  snow: 'Снег',
}

export const phaseInfo = (id: Phase) => PHASES.find((p) => p.id === id)!

/** Границы суток. Фиксированные — без геолокации и астрономии, зато честно и предсказуемо. */
export function phaseAt(date = new Date()): Phase {
  const h = date.getHours() + date.getMinutes() / 60
  if (h >= 5 && h < 7.5) return 'dawn'
  if (h >= 7.5 && h < 17) return 'day'
  if (h >= 17 && h < 19) return 'sunset'
  if (h >= 19 && h < 21) return 'dusk'
  return 'night'
}

/** FNV-1a — нужен только детерминированный шум из строки с датой. */
function hash01(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 2 ** 32
}

/**
 * Погода на день — одна и та же при любом заходе в приложение в течение суток,
 * но меняется день ото дня. Вероятность зависит от сезона: зимой чаще снег,
 * в межсезонье — дождь, летом в основном ясно.
 */
export function weatherAt(date = new Date()): Weather {
  const month = date.getMonth() + 1
  const roll = hash01(date.toISOString().slice(0, 10))

  const [snowChance, rainChance] =
    month === 12 || month <= 2
      ? [0.3, 0.12]
      : month === 3 || month === 11
        ? [0.1, 0.28]
        : month >= 4 && month <= 5
          ? [0, 0.3]
          : month >= 9 && month <= 10
            ? [0, 0.34]
            : [0, 0.16]

  if (roll < snowChance) return 'snow'
  if (roll < snowChance + rainChance) return 'rain'
  return 'clear'
}

export interface Resolved {
  phase: Phase
  weather: Weather
  lightness: Lightness
  /** Час, по которому рисуется положение солнца или луны. */
  hour: number
}

export function resolve(settings: SkySettings, now = new Date()): Resolved {
  const phase = settings.mode === 'auto' ? phaseAt(now) : settings.mode
  const weather = settings.weather === 'auto' ? weatherAt(now) : settings.weather
  const hour =
    settings.mode === 'auto' ? now.getHours() + now.getMinutes() / 60 : phaseInfo(phase).refHour
  return { phase, weather, lightness: phaseInfo(phase).lightness, hour }
}

const SUNRISE = 5
const SUNSET = 19.5

/**
 * Положение светила: солнце идёт по дуге от рассвета к закату, ночью его
 * сменяет луна со своей дугой. x/y — проценты для позиционирования.
 */
export function celestial(hour: number) {
  const isDay = hour >= SUNRISE && hour < SUNSET
  const t = isDay
    ? (hour - SUNRISE) / (SUNSET - SUNRISE)
    : ((hour < SUNRISE ? hour + 24 : hour) - SUNSET) / (24 - SUNSET + SUNRISE)

  const altitude = Math.sin(Math.PI * t) // 0 у горизонта, 1 в зените
  return {
    body: isDay ? ('sun' as const) : ('moon' as const),
    x: 7 + t * 86,
    y: 84 - altitude * 66,
    altitude,
  }
}

export function applyTheme({ phase, weather, lightness }: Resolved, scenery: boolean) {
  const root = document.documentElement
  root.dataset.phase = phase
  root.dataset.weather = weather
  root.dataset.lightness = lightness
  root.dataset.scenery = scenery ? 'on' : 'off'
}

const STORAGE_KEY = 'sky-settings'

export function loadSettings(): SkySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: SkySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
