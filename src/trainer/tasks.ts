// Сгенерировано: задачи тренажёра кода. Условия, тесты и эталонные решения.
// Эталоны проверены теми же тестами (scripts/verify-tasks.mjs).

export interface CodeTest {
  /** Подпись в таблице результатов; без неё показывается сам вызов. */
  label?: string
  args?: unknown[]
  /** Свой сценарий: исходник функции (fn, sleep) => значение. */
  script?: string
  expected: unknown
}

export interface CodeTask {
  id: string
  /** Набор: к какому шагу расписания относится задача. */
  set: string
  /**
   * 'predict' — «что выведет код»: человек записывает вывод фрагмента code,
   * а сверяется он с output. Тестов, заготовки и функции у такой задачи нет,
   * в solution — разбор.
   */
  kind?: 'predict'
  fn: string
  title: string
  statement: string
  starter: string
  tests: CodeTest[]
  solution: string
  /** Фрагмент для «что выведет код». */
  code?: string
  /** Его настоящий вывод: по строке на каждый console.log. */
  output?: string[]
  /** Карточка с подробным разбором, если она есть. */
  card: string | null
  /**
   * 'vue' — коду доступны API Vue и Pinia и подставные функции Nuxt;
   * 'react' — хуки React, JSX и TypeScript, тестам — рендер без DOM (react-env.entry.js).
   */
  env?: string
}

export interface CodeSet {
  id: string
  title: string
  /** Шаг расписания, который закрывается, когда решены все задачи набора. */
  step: string | null
}

export const CODE_SETS: CodeSet[] = [
  {
    "id": "react-hooks",
    "title": "React · хуки руками",
    "step": null
  },
  {
    "id": "react-ui",
    "title": "React · компоненты руками",
    "step": null
  },
  {
    "id": "react-review",
    "title": "React · ревью и оптимизация",
    "step": null
  },
  {
    "id": "react-p",
    "title": "React · что выведет код",
    "step": null
  },
  {
    "id": "d1",
    "title": "Асинхронность и функции",
    "step": null
  },
  {
    "id": "d1p",
    "title": "Что выведет код: event loop и this",
    "step": null
  },
  {
    "id": "d2",
    "title": "Язык и алгоритмы",
    "step": null
  },
  {
    "id": "d2p",
    "title": "Что выведет код: типы и прототипы",
    "step": null
  },
  {
    "id": "d3",
    "title": "Vue руками",
    "step": null
  },
  {
    "id": "d3p",
    "title": "Что выведет Vue",
    "step": null
  },
  {
    "id": "d4",
    "title": "Pinia и Nuxt",
    "step": null
  },
  {
    "id": "d5",
    "title": "Сеть и браузер",
    "step": null
  },
  {
    "id": "mock",
    "title": "Задачи для пробного интервью",
    "step": null
  },
  {
    "id": "week",
    "title": "Ещё задачи на JavaScript",
    "step": null
  },
  {
    "id": "live",
    "title": "Из прогноза по лайвкодингу",
    "step": "tue-code"
  },
  {
    "id": "mon",
    "title": "Разминка: строки и массивы",
    "step": "mon-code"
  },
  {
    "id": "tue",
    "title": "Массивы, строки, debounce",
    "step": null
  },
  {
    "id": "vue",
    "title": "Vue, Pinia, Nuxt",
    "step": "tue-vue-code"
  },
  {
    "id": "extra",
    "title": "Ещё, если захочется",
    "step": null
  }
]

export const CODE_TASKS: CodeTask[] = [
  {
    "id": "react-debounce",
    "set": "react-hooks",
    "env": "react",
    "fn": "useDebounce",
    "title": "useDebounce",
    "card": null,
    "statement": "Напиши хук `useDebounce(value, delay)`: возвращает значение `value`, но обновляет его только через `delay` миллисекунд после **последнего** изменения.\n\n- Сначала возвращает то же значение, что пришло.\n- Новое значение раньше срока — отсчёт начинается заново.\n\nПрименение: `const query = useDebounce(input, 300)` — запрос уходит, когда человек перестал печатать.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function useDebounce(value, delay) {\n  \n}\n",
    "tests": [
      {
        "label": "сначала — то же значение",
        "script": "(fn, sleep, t) => t.renderHook(({ v }) => fn(v, 50), { v: 'а' }).result.current",
        "expected": "а"
      },
      {
        "label": "до паузы не меняется",
        "script": "async (fn, sleep, t) => {\n  const h = t.renderHook(({ v }) => fn(v, 60), { v: 'а' })\n  h.rerender({ v: 'б' })\n  await t.wait(20)\n  return h.result.current\n}",
        "expected": "а"
      },
      {
        "label": "после паузы — последнее значение",
        "script": "async (fn, sleep, t) => {\n  const h = t.renderHook(({ v }) => fn(v, 50), { v: 'а' })\n  h.rerender({ v: 'б' })\n  await t.wait(10)\n  h.rerender({ v: 'в' })\n  await t.wait(100)\n  return h.result.current\n}",
        "expected": "в"
      },
      {
        "label": "каждое изменение сдвигает срок",
        "script": "async (fn, sleep, t) => {\n  const h = t.renderHook(({ v }) => fn(v, 60), { v: 'а' })\n  h.rerender({ v: 'б' })\n  await t.wait(35)\n  h.rerender({ v: 'в' })\n  await t.wait(35)\n  const early = h.result.current\n  await t.wait(70)\n  return [early, h.result.current]\n}",
        "expected": [
          "а",
          "в"
        ]
      },
      {
        "label": "после размонтирования таймеров не остаётся",
        "script": "async (fn, sleep, t) => {\n  const active = new Set()\n  // bind: в браузере таймеры, вызванные без своего this, бросают Illegal invocation\n  const g = globalThis\n  const real = { st: g.setTimeout.bind(g), si: g.setInterval.bind(g), ct: g.clearTimeout.bind(g), ci: g.clearInterval.bind(g) }\n  const saved = { setTimeout: g.setTimeout, setInterval: g.setInterval, clearTimeout: g.clearTimeout, clearInterval: g.clearInterval }\n  globalThis.setTimeout = (f, ms, ...a) => { const id = real.st(() => { active.delete(id); f(...a) }, ms); active.add(id); return id }\n  globalThis.setInterval = (f, ms, ...a) => { const id = real.si(f, ms, ...a); active.add(id); return id }\n  globalThis.clearTimeout = (id) => { active.delete(id); real.ct(id) }\n  globalThis.clearInterval = (id) => { active.delete(id); real.ci(id) }\n  const restore = () => Object.assign(g, saved)\n  try {\n    const h = t.renderHook(({ v }) => fn(v, 200), { v: 'а' })\n    h.rerender({ v: 'б' })\n    h.unmount()\n    return active.size\n  } finally {\n    restore()\n  }\n}",
        "expected": 0
      }
    ],
    "solution": "function useDebounce(value, delay) {\n  const [debounced, setDebounced] = useState(value)\n\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay)\n    // Новое значение раньше срока или размонтирование — старый таймер отменяется\n    return () => clearTimeout(id)\n  }, [value, delay])\n\n  return debounced\n}"
  },
  {
    "id": "react-previous",
    "set": "react-hooks",
    "env": "react",
    "fn": "usePrevious",
    "title": "usePrevious",
    "card": null,
    "statement": "Напиши хук `usePrevious(value)`: возвращает значение, которое было на **прошлом** рендере. На первом рендере — `undefined`.\n\nПрименение: сравнить новый проп со старым — «цена выросла или упала».\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function usePrevious(value) {\n  \n}\n",
    "tests": [
      {
        "label": "первый рендер — undefined",
        "script": "(fn, sleep, t) => t.renderHook(({ v }) => fn(v), { v: 1 }).result.current === undefined",
        "expected": true
      },
      {
        "label": "дальше — значение прошлого рендера",
        "script": "(fn, sleep, t) => {\n  const h = t.renderHook(({ v }) => fn(v), { v: 1 })\n  h.rerender({ v: 2 })\n  const a = h.result.current\n  h.rerender({ v: 5 })\n  return [a, h.result.current]\n}",
        "expected": [
          1,
          2
        ]
      },
      {
        "label": "повторный рендер с тем же значением",
        "script": "(fn, sleep, t) => {\n  const h = t.renderHook(({ v }) => fn(v), { v: 1 })\n  h.rerender({ v: 5 })\n  h.rerender({ v: 5 })\n  return h.result.current\n}",
        "expected": 5
      }
    ],
    "solution": "function usePrevious(value) {\n  const ref = useRef(undefined)\n\n  // Эффект выполняется после рендера: во время рендера ref ещё хранит\n  // прошлое значение, а записываем новое уже к следующему рендеру\n  useEffect(() => {\n    ref.current = value\n  })\n\n  return ref.current\n}\n// Вариант без чтения ref во время рендера (так советует документация React 19):\n// хранить пару «текущее / прошлое» в useState и обновлять, когда value изменилось"
  },
  {
    "id": "react-fetch",
    "set": "react-hooks",
    "env": "react",
    "fn": "useFetch",
    "title": "useFetch с отменой запроса",
    "card": null,
    "statement": "Напиши хук `useFetch(url, fetcher)`.\n\n- `fetcher(url, signal)` возвращает промис с данными, `signal` — от `AbortController`.\n- Хук возвращает `{ data, error, loading }`. Сначала `data` и `error` — `null`, `loading` — `true`.\n- Успех — `data` из ответа, `loading: false`. Ошибка — `error` (сам объект ошибки), `data: null`, `loading: false`.\n- Сменился `url` — новый запрос, а **прошлый отменяется** через `abort()`. Ответ на устаревший запрос не должен попасть в `data`.\n- При размонтировании запрос тоже отменяется. Отмена — не ошибка: `error` из-за неё не появляется.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function useFetch(url, fetcher) {\n  \n}\n",
    "tests": [
      {
        "label": "загрузка, потом данные",
        "script": "async (fn, sleep, t) => {\n  const make = (delays, log = []) => (url, signal) => {\n    log.push(signal)\n    return new Promise((resolve, reject) => {\n      const id = setTimeout(() => resolve('данные ' + url), delays[url] ?? 10)\n      signal.addEventListener('abort', () => {\n        clearTimeout(id)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  const h = t.renderHook(({ u }) => fn(u, make({ '/a': 20 })), { u: '/a' })\n  const first = [h.result.current.loading, h.result.current.data]\n  await t.wait(60)\n  return [first, [h.result.current.loading, h.result.current.data, h.result.current.error]]\n}",
        "expected": [
          [
            true,
            null
          ],
          [
            false,
            "данные /a",
            null
          ]
        ]
      },
      {
        "label": "ошибка сервера",
        "script": "async (fn, sleep, t) => {\n  const h = t.renderHook(({ u }) => fn(u, async () => { throw new Error('500') }), { u: '/a' })\n  await t.wait(20)\n  const r = h.result.current\n  return [r.loading, r.data, r.error && r.error.message]\n}",
        "expected": [
          false,
          null,
          "500"
        ]
      },
      {
        "label": "медленный старый ответ не затирает новый",
        "script": "async (fn, sleep, t) => {\n  const make = (delays, log = []) => (url, signal) => {\n    log.push(signal)\n    return new Promise((resolve, reject) => {\n      const id = setTimeout(() => resolve('данные ' + url), delays[url] ?? 10)\n      signal.addEventListener('abort', () => {\n        clearTimeout(id)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  const fetcher = make({ '/slow': 80, '/fast': 10 })\n  const h = t.renderHook(({ u }) => fn(u, fetcher), { u: '/slow' })\n  h.rerender({ u: '/fast' })\n  await t.wait(130)\n  return [h.result.current.data, h.result.current.error]\n}",
        "expected": [
          "данные /fast",
          null
        ]
      },
      {
        "label": "смена url отменяет прошлый запрос",
        "script": "async (fn, sleep, t) => {\n  const make = (delays, log = []) => (url, signal) => {\n    log.push(signal)\n    return new Promise((resolve, reject) => {\n      const id = setTimeout(() => resolve('данные ' + url), delays[url] ?? 10)\n      signal.addEventListener('abort', () => {\n        clearTimeout(id)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  const signals = []\n  const fetcher = make({ '/a': 100, '/b': 10 }, signals)\n  const h = t.renderHook(({ u }) => fn(u, fetcher), { u: '/a' })\n  h.rerender({ u: '/b' })\n  await t.wait(30)\n  return signals[0].aborted\n}",
        "expected": true
      },
      {
        "label": "размонтирование отменяет запрос",
        "script": "async (fn, sleep, t) => {\n  const make = (delays, log = []) => (url, signal) => {\n    log.push(signal)\n    return new Promise((resolve, reject) => {\n      const id = setTimeout(() => resolve('данные ' + url), delays[url] ?? 10)\n      signal.addEventListener('abort', () => {\n        clearTimeout(id)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  const signals = []\n  const h = t.renderHook(({ u }) => fn(u, make({ '/a': 100 }, signals)), { u: '/a' })\n  h.unmount()\n  return signals[0].aborted\n}",
        "expected": true
      }
    ],
    "solution": "function useFetch(url, fetcher) {\n  const [state, setState] = useState({ data: null, error: null, loading: true })\n\n  useEffect(() => {\n    const controller = new AbortController()\n    setState((s) => ({ ...s, loading: true, error: null }))\n\n    fetcher(url, controller.signal)\n      .then((data) => {\n        // На случай fetcher, который не умеет отменяться: устаревший ответ не пишем\n        if (!controller.signal.aborted) setState({ data, error: null, loading: false })\n      })\n      .catch((error) => {\n        if (error.name === 'AbortError') return // отменили сами — это не ошибка\n        setState({ data: null, error, loading: false })\n      })\n\n    // Сменился url или компонент ушёл со страницы — прошлый запрос не нужен\n    return () => controller.abort()\n  }, [url])\n\n  return state\n}\n// fetcher нет в зависимостях намеренно: стрелка, созданная на каждый рендер,\n// перезапускала бы запрос бесконечно. В проекте его оборачивают в useCallback"
  },
  {
    "id": "react-storage",
    "set": "react-hooks",
    "env": "react",
    "fn": "useLocalStorage",
    "title": "useLocalStorage",
    "card": null,
    "statement": "Напиши хук `useLocalStorage(key, initial, storage)`: как `useState`, только значение живёт в хранилище.\n\n- Возвращает `[value, setValue]`.\n- При первом рендере читает `storage.getItem(key)`: есть значение — `JSON.parse`, нет или битый JSON — `initial`. Хранилище читается **один раз**, а не на каждый рендер.\n- Каждое новое значение записывается: `storage.setItem(key, JSON.stringify(value))`.\n- `setValue` принимает и функцию: `setValue((n) => n + 1)`, и два таких вызова подряд дают `+2`.\n- `storage` передаётся аргументом: в тестах это подделка, в жизни — `localStorage`.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function useLocalStorage(key, initial, storage) {\n  \n}\n",
    "tests": [
      {
        "label": "читает сохранённое",
        "script": "(fn, sleep, t) => {\n  const s = { data: {}, reads: 0, getItem(k) { this.reads++; return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  s.data.theme = '\"dark\"'\n  return t.renderHook(() => fn('theme', 'light', s)).result.current[0]\n}",
        "expected": "dark"
      },
      {
        "label": "нет значения или битый JSON — initial",
        "script": "(fn, sleep, t) => {\n  const s = { data: {}, reads: 0, getItem(k) { this.reads++; return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  s.data.broken = '{oops'\n  const a = t.renderHook(() => fn('none', 'по умолчанию', s)).result.current[0]\n  const b = t.renderHook(() => fn('broken', 'по умолчанию', s)).result.current[0]\n  return [a, b]\n}",
        "expected": [
          "по умолчанию",
          "по умолчанию"
        ]
      },
      {
        "label": "новое значение записывается",
        "script": "(fn, sleep, t) => {\n  const s = { data: {}, reads: 0, getItem(k) { this.reads++; return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  const h = t.renderHook(() => fn('n', 0, s))\n  t.act(() => h.result.current[1](5))\n  return [h.result.current[0], s.data.n]\n}",
        "expected": [
          5,
          "5"
        ]
      },
      {
        "label": "две функции-обновления подряд — +2",
        "script": "(fn, sleep, t) => {\n  const s = { data: {}, reads: 0, getItem(k) { this.reads++; return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  const h = t.renderHook(() => fn('n', 5, s))\n  t.act(() => {\n    h.result.current[1]((n) => n + 1)\n    h.result.current[1]((n) => n + 1)\n  })\n  return h.result.current[0]\n}",
        "expected": 7
      },
      {
        "label": "хранилище читается один раз",
        "script": "(fn, sleep, t) => {\n  const s = { data: {}, reads: 0, getItem(k) { this.reads++; return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  const h = t.renderHook(() => fn('n', 0, s))\n  h.rerender()\n  h.rerender()\n  t.act(() => h.result.current[1](1))\n  return s.reads\n}",
        "expected": 1
      }
    ],
    "solution": "function useLocalStorage(key, initial, storage) {\n  // Функция в useState — ленивая инициализация: выполнится только на первом рендере\n  const [value, setValue] = useState(() => {\n    try {\n      const raw = storage.getItem(key)\n      return raw === null ? initial : JSON.parse(raw)\n    } catch {\n      return initial // битое значение не должно ронять страницу\n    }\n  })\n\n  useEffect(() => {\n    storage.setItem(key, JSON.stringify(value))\n  }, [key, value, storage])\n\n  // Отдаём сам setValue из useState: он уже умеет функции-обновления\n  return [value, setValue]\n}"
  },
  {
    "id": "react-countdown",
    "set": "react-hooks",
    "env": "react",
    "fn": "useCountdown",
    "title": "useCountdown на setInterval",
    "card": null,
    "statement": "Напиши хук `useCountdown(from, ms = 1000)`: обратный отсчёт.\n\n- Возвращает число, которое начинается с `from` и уменьшается на 1 каждые `ms` миллисекунд.\n- Дошёл до `0` — останавливается: ниже нуля не уходит, и **интервал снимается**.\n- При размонтировании интервал тоже снимается.\n- Значения идут подряд: `3, 2, 1, 0`, без застревания на одном числе.\n\nЗдесь легко попасть на «устаревшее замыкание» — подумай, какое значение видит колбэк интервала.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function useCountdown(from, ms = 1000) {\n  \n}\n",
    "tests": [
      {
        "label": "отсчёт идёт подряд и останавливается на нуле",
        "script": "async (fn, sleep, t) => {\n  const h = t.renderHook(() => fn(3, 20))\n  await t.wait(150)\n  return [...new Set(h.result.all)]\n}",
        "expected": [
          3,
          2,
          1,
          0
        ]
      },
      {
        "label": "на нуле таймеров не остаётся",
        "script": "async (fn, sleep, t) => {\n  const active = new Set()\n  // bind: в браузере таймеры, вызванные без своего this, бросают Illegal invocation\n  const g = globalThis\n  const real = { st: g.setTimeout.bind(g), si: g.setInterval.bind(g), ct: g.clearTimeout.bind(g), ci: g.clearInterval.bind(g) }\n  const saved = { setTimeout: g.setTimeout, setInterval: g.setInterval, clearTimeout: g.clearTimeout, clearInterval: g.clearInterval }\n  globalThis.setTimeout = (f, ms, ...a) => { const id = real.st(() => { active.delete(id); f(...a) }, ms); active.add(id); return id }\n  globalThis.setInterval = (f, ms, ...a) => { const id = real.si(f, ms, ...a); active.add(id); return id }\n  globalThis.clearTimeout = (id) => { active.delete(id); real.ct(id) }\n  globalThis.clearInterval = (id) => { active.delete(id); real.ci(id) }\n  const restore = () => Object.assign(g, saved)\n  try {\n    t.renderHook(() => fn(2, 15))\n    await t.wait(120)\n    return active.size\n  } finally {\n    restore()\n  }\n}",
        "expected": 0
      },
      {
        "label": "размонтирование снимает интервал",
        "script": "async (fn, sleep, t) => {\n  const active = new Set()\n  // bind: в браузере таймеры, вызванные без своего this, бросают Illegal invocation\n  const g = globalThis\n  const real = { st: g.setTimeout.bind(g), si: g.setInterval.bind(g), ct: g.clearTimeout.bind(g), ci: g.clearInterval.bind(g) }\n  const saved = { setTimeout: g.setTimeout, setInterval: g.setInterval, clearTimeout: g.clearTimeout, clearInterval: g.clearInterval }\n  globalThis.setTimeout = (f, ms, ...a) => { const id = real.st(() => { active.delete(id); f(...a) }, ms); active.add(id); return id }\n  globalThis.setInterval = (f, ms, ...a) => { const id = real.si(f, ms, ...a); active.add(id); return id }\n  globalThis.clearTimeout = (id) => { active.delete(id); real.ct(id) }\n  globalThis.clearInterval = (id) => { active.delete(id); real.ci(id) }\n  const restore = () => Object.assign(g, saved)\n  try {\n    const h = t.renderHook(() => fn(10, 20))\n    await t.wait(30)\n    h.unmount()\n    return active.size\n  } finally {\n    restore()\n  }\n}",
        "expected": 0
      }
    ],
    "solution": "function useCountdown(from, ms = 1000) {\n  const [left, setLeft] = useState(from)\n  const done = left <= 0\n\n  useEffect(() => {\n    if (done) return // дошли до нуля — интервал больше не нужен\n    const id = setInterval(() => {\n      // Функция-обновление получает свежее значение. setLeft(left - 1)\n      // видел бы left из того рендера, где создан интервал, и застрял бы\n      setLeft((n) => Math.max(0, n - 1))\n    }, ms)\n    return () => clearInterval(id)\n  }, [ms, done])\n\n  return left\n}"
  },
  {
    "id": "react-todo",
    "set": "react-ui",
    "env": "react",
    "fn": "TodoList",
    "title": "Список задач",
    "card": null,
    "statement": "Напиши компонент `TodoList` — список задач.\n\n- `<input>` для текста и кнопка «Добавить».\n- По клику задача добавляется в конец списка `<ul>` как `<li>`. Пустая строка и одни пробелы не добавляются, пробелы по краям обрезаются. После добавления поле очищается.\n- В каждом `<li>` — текст задачи в `<span>` и кнопка «Удалить», которая убирает **эту** задачу.\n- Под списком — `<p>` с текстом «Всего: N».\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно. Тесты ищут элементы по тегам и ролям, поэтому разметку держи такой, как в условии.",
    "starter": "function TodoList() {\n  \n}\n",
    "tests": [
      {
        "label": "задача добавляется",
        "script": "(fn, sleep, t) => {\n  const v = t.render(t.h(fn))\n  t.type(v.get('input'), '  Купить молоко ')\n  t.click(v.byText('Добавить'))\n  return v.all('li').map((li) => li.findAll((n) => n.type === 'span')[0].children.join(''))\n}",
        "expected": [
          "Купить молоко"
        ]
      },
      {
        "label": "поле очищается",
        "script": "(fn, sleep, t) => {\n  const v = t.render(t.h(fn))\n  t.type(v.get('input'), 'а')\n  t.click(v.byText('Добавить'))\n  return v.get('input').props.value\n}",
        "expected": ""
      },
      {
        "label": "пустое и пробелы не добавляются",
        "script": "(fn, sleep, t) => {\n  const v = t.render(t.h(fn))\n  t.click(v.byText('Добавить'))\n  t.type(v.get('input'), '   ')\n  t.click(v.byText('Добавить'))\n  return v.all('li').length\n}",
        "expected": 0
      },
      {
        "label": "удаляется нужная задача",
        "script": "(fn, sleep, t) => {\n  const v = t.render(t.h(fn))\n  for (const text of ['а', 'б', 'в']) {\n    t.type(v.get('input'), text)\n    t.click(v.byText('Добавить'))\n  }\n  t.click(v.all('li')[1].findAll((n) => n.type === 'button')[0])\n  return v.all('li').map((li) => li.findAll((n) => n.type === 'span')[0].children.join(''))\n}",
        "expected": [
          "а",
          "в"
        ]
      },
      {
        "label": "счётчик «Всего»",
        "script": "(fn, sleep, t) => {\n  const v = t.render(t.h(fn))\n  for (const text of ['а', 'б']) {\n    t.type(v.get('input'), text)\n    t.click(v.byText('Добавить'))\n  }\n  return v.byText('Всего').children.join('')\n}",
        "expected": "Всего: 2"
      }
    ],
    "solution": "function TodoList() {\n  const [todos, setTodos] = useState([])\n  const [text, setText] = useState('')\n  const nextId = useRef(1) // свой счётчик: индекс массива ключом не годится\n\n  function add() {\n    const title = text.trim()\n    if (!title) return\n    // Новый массив, а не push: React сравнивает состояние по ссылке\n    setTodos((list) => [...list, { id: nextId.current++, title }])\n    setText('')\n  }\n\n  function remove(id) {\n    setTodos((list) => list.filter((todo) => todo.id !== id))\n  }\n\n  return (\n    <div>\n      <input value={text} onChange={(e) => setText(e.target.value)} />\n      <button onClick={add}>Добавить</button>\n      <ul>\n        {todos.map((todo) => (\n          <li key={todo.id}>\n            <span>{todo.title}</span>\n            <button onClick={() => remove(todo.id)}>Удалить</button>\n          </li>\n        ))}\n      </ul>\n      <p>Всего: {todos.length}</p>\n    </div>\n  )\n}"
  },
  {
    "id": "react-tabs",
    "set": "react-ui",
    "env": "react",
    "fn": "Tabs",
    "title": "Доступные вкладки",
    "card": null,
    "statement": "Напиши компонент `Tabs({ tabs })`, где `tabs` — массив `{ id, title, content }`. Вкладки должны быть доступны для экранных дикторов и клавиатуры — это то, что спрашивают про ARIA.\n\n- Кнопки вкладок лежат в контейнере с `role=\"tablist\"`. Каждая кнопка — `role=\"tab\"`, с `aria-selected` (`true` или `false`) и `aria-controls`, равным `panel-<id>`.\n- Под ними одна панель: `role=\"tabpanel\"`, `id` — `panel-<id>` активной вкладки, внутри — её `content`.\n- Сначала активна первая вкладка, клик по вкладке делает её активной.\n- Стрелки `→` и `←` на вкладке (`onKeyDown`) переключают на соседнюю, по кругу.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно. Тесты ищут элементы по тегам и ролям, поэтому разметку держи такой, как в условии.",
    "starter": "function Tabs({ tabs }) {\n  \n}\n",
    "tests": [
      {
        "label": "роли на месте",
        "script": "(fn, sleep, t) => {\n  const tabs = [{ id: 'about', title: 'Описание', content: 'Текст описания' }, { id: 'specs', title: 'Характеристики', content: 'Вес 1 кг' }, { id: 'reviews', title: 'Отзывы', content: 'Пока нет отзывов' }]\n  const v = t.render(t.h(fn, { tabs }))\n  return [v.allByRole('tablist').length, v.allByRole('tab').length, v.allByRole('tabpanel').length]\n}",
        "expected": [
          1,
          3,
          1
        ]
      },
      {
        "label": "сначала активна первая",
        "script": "(fn, sleep, t) => {\n  const tabs = [{ id: 'about', title: 'Описание', content: 'Текст описания' }, { id: 'specs', title: 'Характеристики', content: 'Вес 1 кг' }, { id: 'reviews', title: 'Отзывы', content: 'Пока нет отзывов' }]\n  const v = t.render(t.h(fn, { tabs }))\n  return [v.allByRole('tab').map((tab) => tab.props['aria-selected']), v.byRole('tabpanel').children.join('')]\n}",
        "expected": [
          [
            true,
            false,
            false
          ],
          "Текст описания"
        ]
      },
      {
        "label": "клик переключает",
        "script": "(fn, sleep, t) => {\n  const tabs = [{ id: 'about', title: 'Описание', content: 'Текст описания' }, { id: 'specs', title: 'Характеристики', content: 'Вес 1 кг' }, { id: 'reviews', title: 'Отзывы', content: 'Пока нет отзывов' }]\n  const v = t.render(t.h(fn, { tabs }))\n  t.click(v.allByRole('tab')[2])\n  return [v.allByRole('tab').map((tab) => tab.props['aria-selected']), v.byRole('tabpanel').children.join('')]\n}",
        "expected": [
          [
            false,
            false,
            true
          ],
          "Пока нет отзывов"
        ]
      },
      {
        "label": "aria-controls указывает на панель",
        "script": "(fn, sleep, t) => {\n  const tabs = [{ id: 'about', title: 'Описание', content: 'Текст описания' }, { id: 'specs', title: 'Характеристики', content: 'Вес 1 кг' }, { id: 'reviews', title: 'Отзывы', content: 'Пока нет отзывов' }]\n  const v = t.render(t.h(fn, { tabs }))\n  t.click(v.allByRole('tab')[1])\n  const active = v.allByRole('tab')[1]\n  return [active.props['aria-controls'], v.byRole('tabpanel').props.id]\n}",
        "expected": [
          "panel-specs",
          "panel-specs"
        ]
      },
      {
        "label": "стрелки переключают по кругу",
        "script": "(fn, sleep, t) => {\n  const tabs = [{ id: 'about', title: 'Описание', content: 'Текст описания' }, { id: 'specs', title: 'Характеристики', content: 'Вес 1 кг' }, { id: 'reviews', title: 'Отзывы', content: 'Пока нет отзывов' }]\n  const v = t.render(t.h(fn, { tabs }))\n  t.keyDown(v.allByRole('tab')[0], 'ArrowLeft')\n  const afterLeft = v.byRole('tabpanel').props.id\n  t.keyDown(v.allByRole('tab')[2], 'ArrowRight')\n  return [afterLeft, v.byRole('tabpanel').props.id]\n}",
        "expected": [
          "panel-reviews",
          "panel-about"
        ]
      }
    ],
    "solution": "function Tabs({ tabs }) {\n  const [active, setActive] = useState(0)\n\n  function onKeyDown(e) {\n    if (e.key === 'ArrowRight') setActive((i) => (i + 1) % tabs.length)\n    if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + tabs.length) % tabs.length)\n  }\n\n  const current = tabs[active]\n  return (\n    <div>\n      <div role=\"tablist\">\n        {tabs.map((tab, i) => (\n          <button\n            key={tab.id}\n            role=\"tab\"\n            aria-selected={i === active}\n            aria-controls={`panel-${tab.id}`}\n            // «Блуждающий» tabIndex: Tab попадает только в активную вкладку,\n            // дальше по вкладкам ходят стрелками\n            tabIndex={i === active ? 0 : -1}\n            onClick={() => setActive(i)}\n            onKeyDown={onKeyDown}\n          >\n            {tab.title}\n          </button>\n        ))}\n      </div>\n      <div role=\"tabpanel\" id={`panel-${current.id}`}>\n        {current.content}\n      </div>\n    </div>\n  )\n}\n// В браузере после стрелки ещё переводят фокус на новую вкладку (ref и focus())"
  },
  {
    "id": "react-class",
    "set": "react-ui",
    "env": "react",
    "fn": "UserCard",
    "title": "Переписать классовый компонент на хуки",
    "card": null,
    "statement": "Легаси: классовый компонент `UserCard` грузит пользователя по `id`. Перепиши его **функциональным компонентом с хуками**, сохранив поведение.\n\n- `props.load(id)` возвращает промис с `{ name }`.\n- Пока данных нет — `<p>Загрузка…</p>`, потом `<p>` с именем.\n- Сменился `id` — загрузка заново.\n- Ответ для старого `id` не должен попасть на экран, если `id` уже сменился.\n\nПодумай, какому хуку соответствуют `componentDidMount`, `componentDidUpdate` и `componentWillUnmount` вместе.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "class UserCard extends Component {\n  state = { user: null }\n\n  componentDidMount() {\n    this.load()\n  }\n\n  componentDidUpdate(prevProps) {\n    if (prevProps.id !== this.props.id) this.load()\n  }\n\n  componentWillUnmount() {\n    this.cancelled = true\n  }\n\n  load() {\n    const id = this.props.id\n    this.setState({ user: null })\n    this.props.load(id).then((user) => {\n      // Пока грузили, компонент могли убрать или сменить id\n      if (!this.cancelled && id === this.props.id) this.setState({ user })\n    })\n  }\n\n  render() {\n    if (!this.state.user) return <p>Загрузка…</p>\n    return <p>{this.state.user.name}</p>\n  }\n}\n",
    "tests": [
      {
        "label": "это функциональный компонент",
        "script": "(fn) => typeof fn === 'function' && !(fn.prototype && fn.prototype.isReactComponent)",
        "expected": true
      },
      {
        "label": "загрузка, потом имя",
        "script": "async (fn, sleep, t) => {\n  const load = (id) => new Promise((r) => setTimeout(() => r({ name: 'Пользователь ' + id }), id === 1 ? 60 : 10))\n  const v = t.render(t.h(fn, { id: 2, load }))\n  const first = v.text()\n  await t.wait(40)\n  return [first, v.text()]\n}",
        "expected": [
          "Загрузка…",
          "Пользователь 2"
        ]
      },
      {
        "label": "смена id загружает заново",
        "script": "async (fn, sleep, t) => {\n  const load = (id) => new Promise((r) => setTimeout(() => r({ name: 'Пользователь ' + id }), id === 1 ? 60 : 10))\n  const v = t.render(t.h(fn, { id: 2, load }))\n  await t.wait(30)\n  v.rerender(t.h(fn, { id: 3, load }))\n  const during = v.text()\n  await t.wait(30)\n  return [during, v.text()]\n}",
        "expected": [
          "Загрузка…",
          "Пользователь 3"
        ]
      },
      {
        "label": "медленный ответ для старого id не затирает новый",
        "script": "async (fn, sleep, t) => {\n  const load = (id) => new Promise((r) => setTimeout(() => r({ name: 'Пользователь ' + id }), id === 1 ? 60 : 10))\n  const v = t.render(t.h(fn, { id: 1, load }))\n  v.rerender(t.h(fn, { id: 2, load }))\n  await t.wait(100)\n  return v.text()\n}",
        "expected": "Пользователь 2"
      }
    ],
    "solution": "function UserCard({ id, load }) {\n  const [user, setUser] = useState(null)\n\n  // Один эффект вместо трёх методов: запуск при монтировании и смене id\n  // (componentDidMount + componentDidUpdate), очистка — componentWillUnmount\n  useEffect(() => {\n    let cancelled = false\n    setUser(null)\n    load(id).then((u) => {\n      if (!cancelled) setUser(u)\n    })\n    // Очистка выполнится и перед следующим запуском — при смене id,\n    // поэтому ответ для старого id отбрасывается сам\n    return () => {\n      cancelled = true\n    }\n  }, [id])\n\n  if (!user) return <p>Загрузка…</p>\n  return <p>{user.name}</p>\n}"
  },
  {
    "id": "react-memo",
    "set": "react-review",
    "env": "react",
    "fn": "ProductList",
    "title": "Оптимизация: лишние рендеры строк",
    "card": null,
    "statement": "Компонент работает, но медленно на длинном списке: при выборе одного товара перерисовываются **все** строки, и даже кнопка «Обновить», которая к строкам отношения не имеет, перерисовывает их все.\n\nОптимизируй, не меняя поведения и разметки:\n\n- при выборе товара перерисовываются только две строки — та, что была выбрана, и новая;\n- кнопка «Обновить» не перерисовывает строки вовсе.\n\nКаждый рендер строки вызывает `onRender(id)` — по нему тесты и считают рендеры. Проговори вслух, почему сейчас перерисовывается всё, и только потом правь.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function ProductList({ products, onRender }) {\n  const [selectedId, setSelectedId] = useState(null)\n  const [ticks, setTicks] = useState(0)\n\n  return (\n    <div>\n      <button onClick={() => setTicks(ticks + 1)}>Обновить ({ticks})</button>\n      <ul>\n        {products.map((p) => (\n          <Row\n            key={p.id}\n            product={p}\n            selectedId={selectedId}\n            onSelect={(id) => setSelectedId(id)}\n            onRender={onRender}\n          />\n        ))}\n      </ul>\n    </div>\n  )\n}\n\nfunction Row({ product, selectedId, onSelect, onRender }) {\n  onRender(product.id) // для тестов: отмечает каждый рендер строки\n  const selected = product.id === selectedId\n  return (\n    <li>\n      {product.title} {selected ? '✓' : ''}\n      <button aria-pressed={selected} onClick={() => onSelect(product.id)}>\n        Выбрать\n      </button>\n    </li>\n  )\n}\n",
    "tests": [
      {
        "label": "сначала каждая строка рендерится один раз",
        "script": "(fn, sleep, t) => {\n  const log = []\n  const products = [1, 2, 3, 4, 5].map((id) => ({ id, title: 'Товар ' + id }))\n  const v = t.render(t.h(fn, { products, onRender: (id) => log.push(id) }))\n  const pick = (i) => t.click(v.all('li')[i].findAll((n) => n.type === 'button')[0])\n  return log\n}",
        "expected": [
          1,
          2,
          3,
          4,
          5
        ]
      },
      {
        "label": "выбор товара — рендер только его строки",
        "script": "(fn, sleep, t) => {\n  const log = []\n  const products = [1, 2, 3, 4, 5].map((id) => ({ id, title: 'Товар ' + id }))\n  const v = t.render(t.h(fn, { products, onRender: (id) => log.push(id) }))\n  const pick = (i) => t.click(v.all('li')[i].findAll((n) => n.type === 'button')[0])\n  log.length = 0\n  pick(2)\n  return log\n}",
        "expected": [
          3
        ]
      },
      {
        "label": "смена выбора — две строки: старая и новая",
        "script": "(fn, sleep, t) => {\n  const log = []\n  const products = [1, 2, 3, 4, 5].map((id) => ({ id, title: 'Товар ' + id }))\n  const v = t.render(t.h(fn, { products, onRender: (id) => log.push(id) }))\n  const pick = (i) => t.click(v.all('li')[i].findAll((n) => n.type === 'button')[0])\n  pick(2)\n  log.length = 0\n  pick(4)\n  return [...log].sort()\n}",
        "expected": [
          3,
          5
        ]
      },
      {
        "label": "«Обновить» не трогает строки",
        "script": "(fn, sleep, t) => {\n  const log = []\n  const products = [1, 2, 3, 4, 5].map((id) => ({ id, title: 'Товар ' + id }))\n  const v = t.render(t.h(fn, { products, onRender: (id) => log.push(id) }))\n  const pick = (i) => t.click(v.all('li')[i].findAll((n) => n.type === 'button')[0])\n  log.length = 0\n  t.click(v.byText('Обновить'))\n  return log\n}",
        "expected": []
      },
      {
        "label": "выбор виден на экране",
        "script": "(fn, sleep, t) => {\n  const log = []\n  const products = [1, 2, 3, 4, 5].map((id) => ({ id, title: 'Товар ' + id }))\n  const v = t.render(t.h(fn, { products, onRender: (id) => log.push(id) }))\n  const pick = (i) => t.click(v.all('li')[i].findAll((n) => n.type === 'button')[0])\n  pick(1)\n  return v.all('li').map((li) => li.findAll((n) => n.type === 'button')[0].props['aria-pressed'])\n}",
        "expected": [
          false,
          true,
          false,
          false,
          false
        ]
      }
    ],
    "solution": "function ProductList({ products, onRender }) {\n  const [selectedId, setSelectedId] = useState(null)\n  const [ticks, setTicks] = useState(0)\n\n  // 1. Одна и та же функция между рендерами: стрелка в JSX новая каждый раз,\n  //    и memo строки бы не помог. Сеттер из useState стабилен сам по себе\n  const select = useCallback((id) => setSelectedId(id), [])\n\n  return (\n    <div>\n      <button onClick={() => setTicks((n) => n + 1)}>Обновить ({ticks})</button>\n      <ul>\n        {products.map((p) => (\n          <Row\n            key={p.id}\n            product={p}\n            // 2. Каждой строке — только её булево значение, а не общий selectedId:\n            //    иначе при смене выбора меняются пропсы всех строк\n            selected={p.id === selectedId}\n            onSelect={select}\n            onRender={onRender}\n          />\n        ))}\n      </ul>\n    </div>\n  )\n}\n\n// 3. memo пропускает рендер, если пропсы не изменились (сравнение по ===)\nconst Row = memo(function Row({ product, selected, onSelect, onRender }) {\n  onRender(product.id)\n  return (\n    <li>\n      {product.title} {selected ? '✓' : ''}\n      <button aria-pressed={selected} onClick={() => onSelect(product.id)}>\n        Выбрать\n      </button>\n    </li>\n  )\n})"
  },
  {
    "id": "react-review-timer",
    "set": "react-review",
    "env": "react",
    "fn": "Stopwatch",
    "title": "Ревью: секундомер",
    "card": null,
    "statement": "Код на ревью: секундомер. «Старт» запускает, «Пауза» останавливает, «Сброс» обнуляет. Проп `tick` — длина «секунды» в миллисекундах, чтобы тесты не ждали по-настоящему.\n\nВ коде **две ошибки**: из-за одной секундомер застревает, из-за другой его нельзя остановить, а таймеры копятся. Найди обе глазами и проговори, почему так происходит, потом исправь и запусти тесты.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function Stopwatch({ tick = 1000 }) {\n  const [seconds, setSeconds] = useState(0)\n  const [running, setRunning] = useState(false)\n\n  useEffect(() => {\n    if (!running) return\n    setInterval(() => {\n      setSeconds(seconds + 1)\n    }, tick)\n  }, [running])\n\n  return (\n    <div>\n      <p>{seconds} с</p>\n      <button onClick={() => setRunning(!running)}>{running ? 'Пауза' : 'Старт'}</button>\n      <button\n        onClick={() => {\n          setRunning(false)\n          setSeconds(0)\n        }}\n      >\n        Сброс\n      </button>\n    </div>\n  )\n}\n",
    "tests": [
      {
        "label": "секунды идут подряд",
        "script": "async (fn, sleep, t) => {\n  const v = t.render(t.h(fn, { tick: 20 }))\n  const sec = () => Number(v.get('p').children.join('').split(' ')[0])\n  t.click(v.byText('Старт'))\n  await t.wait(110)\n  const n = sec()\n  return n >= 4 && n <= 6\n}",
        "expected": true
      },
      {
        "label": "пауза останавливает",
        "script": "async (fn, sleep, t) => {\n  const v = t.render(t.h(fn, { tick: 20 }))\n  const sec = () => Number(v.get('p').children.join('').split(' ')[0])\n  t.click(v.byText('Старт'))\n  await t.wait(70)\n  t.click(v.byText('Пауза'))\n  const paused = sec()\n  await t.wait(80)\n  return paused > 0 && sec() === paused\n}",
        "expected": true
      },
      {
        "label": "после размонтирования таймеров не остаётся",
        "script": "async (fn, sleep, t) => {\n  const active = new Set()\n  // bind: в браузере таймеры, вызванные без своего this, бросают Illegal invocation\n  const g = globalThis\n  const real = { st: g.setTimeout.bind(g), si: g.setInterval.bind(g), ct: g.clearTimeout.bind(g), ci: g.clearInterval.bind(g) }\n  const saved = { setTimeout: g.setTimeout, setInterval: g.setInterval, clearTimeout: g.clearTimeout, clearInterval: g.clearInterval }\n  globalThis.setTimeout = (f, ms, ...a) => { const id = real.st(() => { active.delete(id); f(...a) }, ms); active.add(id); return id }\n  globalThis.setInterval = (f, ms, ...a) => { const id = real.si(f, ms, ...a); active.add(id); return id }\n  globalThis.clearTimeout = (id) => { active.delete(id); real.ct(id) }\n  globalThis.clearInterval = (id) => { active.delete(id); real.ci(id) }\n  const restore = () => Object.assign(g, saved)\n  try {\n    const v = t.render(t.h(fn, { tick: 20 }))\n    t.click(v.byText('Старт'))\n    await t.wait(50)\n    v.unmount()\n    return active.size\n  } finally {\n    restore()\n  }\n}",
        "expected": 0
      },
      {
        "label": "сброс",
        "script": "async (fn, sleep, t) => {\n  const v = t.render(t.h(fn, { tick: 20 }))\n  t.click(v.byText('Старт'))\n  await t.wait(50)\n  t.click(v.byText('Сброс'))\n  await t.wait(50)\n  return v.get('p').children.join('')\n}",
        "expected": "0 с"
      }
    ],
    "solution": "function Stopwatch({ tick = 1000 }) {\n  const [seconds, setSeconds] = useState(0)\n  const [running, setRunning] = useState(false)\n\n  useEffect(() => {\n    if (!running) return\n    const id = setInterval(() => {\n      // Ошибка 1: было setSeconds(seconds + 1). Колбэк интервала создан\n      // в первом рендере и навсегда видит seconds = 0 — счёт застревал на 1\n      setSeconds((s) => s + 1)\n    }, tick)\n    // Ошибка 2: не было очистки. «Пауза» не останавливала интервал,\n    // а каждый новый «Старт» добавлял ещё один\n    return () => clearInterval(id)\n  }, [running, tick])\n\n  return (\n    <div>\n      <p>{seconds} с</p>\n      <button onClick={() => setRunning((r) => !r)}>{running ? 'Пауза' : 'Старт'}</button>\n      <button\n        onClick={() => {\n          setRunning(false)\n          setSeconds(0)\n        }}\n      >\n        Сброс\n      </button>\n    </div>\n  )\n}"
  },
  {
    "id": "react-review-list",
    "set": "react-review",
    "env": "react",
    "fn": "ShoppingList",
    "title": "Ревью: список покупок",
    "card": null,
    "statement": "Код на ревью: список покупок. Можно добавить позицию, отметить флажком и удалить. В коде **три ошибки** — две классические для React и одна про идентификаторы. Найди их глазами и проговори, потом исправь.\n\nКак должно работать:\n\n- добавленная позиция сразу появляется в списке, а счётчик под ним показывает новое число;\n- флажок остаётся у той позиции, которую отметили, даже если удалить позицию выше;\n- две позиции, добавленные подряд, удаляются по отдельности.\n\n\nХуки доступны без импорта, но `import { useState } from 'react'` тоже работает. JSX и TypeScript можно.",
    "starter": "function ShoppingList({ initial }) {\n  const [items, setItems] = useState(initial)\n  const [text, setText] = useState('')\n\n  function add() {\n    items.push({ id: Date.now(), title: text })\n    setItems(items)\n    setText('')\n  }\n\n  function remove(id) {\n    setItems(items.filter((item) => item.id !== id))\n  }\n\n  return (\n    <div>\n      <input value={text} onChange={(e) => setText(e.target.value)} />\n      <button onClick={add}>Добавить</button>\n      <ul>\n        {items.map((item, index) => (\n          <Item key={index} item={item} onRemove={remove} />\n        ))}\n      </ul>\n      <Summary items={items} />\n    </div>\n  )\n}\n\nconst Summary = memo(function Summary({ items }) {\n  return <p>Позиций: {items.length}</p>\n})\n\nfunction Item({ item, onRemove }) {\n  const [done, setDone] = useState(false)\n  return (\n    <li>\n      <input type=\"checkbox\" checked={done} onChange={(e) => setDone(e.target.checked)} />\n      <span>{item.title}</span>\n      <button onClick={() => onRemove(item.id)}>Удалить</button>\n    </li>\n  )\n}\n",
    "tests": [
      {
        "label": "добавленное сразу видно, и счётчик тоже",
        "script": "(fn, sleep, t) => {\n  const initial = [{ id: 1, title: 'Молоко' }, { id: 2, title: 'Хлеб' }]\n  const v = t.render(t.h(fn, { initial }))\n  const add = (text) => { t.type(v.all('input').find((i) => i.props.type !== 'checkbox'), text); t.click(v.byText('Добавить')) }\n  const titles = () => v.all('li').map((li) => li.findAll((n) => n.type === 'span')[0].children.join(''))\n  add('Сыр')\n  return [titles(), v.byText('Позиций').children.join('')]\n}",
        "expected": [
          [
            "Молоко",
            "Хлеб",
            "Сыр"
          ],
          "Позиций: 3"
        ]
      },
      {
        "label": "флажок остаётся у своей позиции после удаления верхней",
        "script": "(fn, sleep, t) => {\n  const initial = [{ id: 1, title: 'Молоко' }, { id: 2, title: 'Хлеб' }]\n  const v = t.render(t.h(fn, { initial }))\n  const add = (text) => { t.type(v.all('input').find((i) => i.props.type !== 'checkbox'), text); t.click(v.byText('Добавить')) }\n  const titles = () => v.all('li').map((li) => li.findAll((n) => n.type === 'span')[0].children.join(''))\n  t.check(v.all('li')[1].findAll((n) => n.type === 'input')[0], true)\n  t.click(v.all('li')[0].findAll((n) => n.type === 'button')[0])\n  const li = v.all('li')[0]\n  return [li.findAll((n) => n.type === 'span')[0].children.join(''), li.findAll((n) => n.type === 'input')[0].props.checked]\n}",
        "expected": [
          "Хлеб",
          true
        ]
      },
      {
        "label": "две позиции подряд удаляются по отдельности",
        "script": "(fn, sleep, t) => {\n  const initial = [{ id: 1, title: 'Молоко' }, { id: 2, title: 'Хлеб' }]\n  const v = t.render(t.h(fn, { initial }))\n  const add = (text) => { t.type(v.all('input').find((i) => i.props.type !== 'checkbox'), text); t.click(v.byText('Добавить')) }\n  const titles = () => v.all('li').map((li) => li.findAll((n) => n.type === 'span')[0].children.join(''))\n  add('Сыр')\n  add('Чай')\n  t.click(v.all('li')[2].findAll((n) => n.type === 'button')[0])\n  return titles()\n}",
        "expected": [
          "Молоко",
          "Хлеб",
          "Чай"
        ]
      }
    ],
    "solution": "function ShoppingList({ initial }) {\n  const [items, setItems] = useState(initial)\n  const [text, setText] = useState('')\n  // Ошибка 3: было id: Date.now(). Две позиции за одну миллисекунду получали\n  // одинаковый id, и «Удалить» убирало обе. Свой счётчик уникален всегда\n  const nextId = useRef(Math.max(0, ...initial.map((i) => i.id)) + 1)\n\n  function add() {\n    // Ошибка 1: было items.push + setItems(items). Тот же массив — React\n    // сравнивает по ссылке, считает, что ничего не изменилось, и не рендерит\n    setItems((list) => [...list, { id: nextId.current++, title: text }])\n    setText('')\n  }\n\n  function remove(id) {\n    setItems((list) => list.filter((item) => item.id !== id))\n  }\n\n  return (\n    <div>\n      <input value={text} onChange={(e) => setText(e.target.value)} />\n      <button onClick={add}>Добавить</button>\n      <ul>\n        {items.map((item) => (\n          // Ошибка 2: было key={index}. После удаления верхней позиции индексы\n          // сдвигаются, и состояние флажка достаётся соседу\n          <Item key={item.id} item={item} onRemove={remove} />\n        ))}\n      </ul>\n      <Summary items={items} />\n    </div>\n  )\n}\n\n// memo сравнивает пропсы по ссылке. С мутацией массива ссылка та же,\n// и счётчик не обновлялся — так ошибка 1 и становится видна\nconst Summary = memo(function Summary({ items }) {\n  return <p>Позиций: {items.length}</p>\n})\n\nfunction Item({ item, onRemove }) {\n  const [done, setDone] = useState(false)\n  return (\n    <li>\n      <input type=\"checkbox\" checked={done} onChange={(e) => setDone(e.target.checked)} />\n      <span>{item.title}</span>\n      <button onClick={() => onRemove(item.id)}>Удалить</button>\n    </li>\n  )\n}"
  },
  {
    "id": "rp-batching",
    "set": "react-p",
    "env": "react",
    "kind": "predict",
    "fn": "",
    "title": "Три setState в одном обработчике",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`. `render` и `click` здесь — помощники тренажёра: смонтировать компонент и нажать кнопку.",
    "code": "function Counter() {\n  const [count, setCount] = useState(0)\n  console.log('render', count)\n\n  function handleClick() {\n    setCount(count + 1)\n    setCount(count + 1)\n    setCount((c) => c + 1)\n    console.log('в обработчике', count)\n  }\n\n  return <button onClick={handleClick}>{count}</button>\n}\n\nconst view = render(<Counter />)\nclick(view.get('button'))",
    "output": [
      "render 0",
      "в обработчике 0",
      "render 2"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `render 0`, `в обработчике 0`, `render 2`.**\n\n- `count` внутри обработчика — значение из того рендера, где обработчик создан. `setCount` не меняет переменную, а заказывает следующий рендер, поэтому `console.log` видит `0`.\n- `setCount(count + 1)` дважды — это дважды «поставь 1». Функция-обновление `(c) => c + 1` получает результат предыдущих обновлений в очереди: `1 + 1 = 2`.\n- Все три вызова объединены в **один** рендер — это батчинг. С React 18 он работает везде: в обработчиках, таймерах и промисах."
  },
  {
    "id": "rp-effects-order",
    "set": "react-p",
    "env": "react",
    "kind": "predict",
    "fn": "",
    "title": "Порядок рендеров, эффектов и очисток",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`. `render` и `click` здесь — помощники тренажёра: смонтировать компонент и нажать кнопку.",
    "code": "function Child() {\n  console.log('render Child')\n  useEffect(() => {\n    console.log('effect Child')\n    return () => console.log('cleanup Child')\n  })\n  return null\n}\n\nfunction Parent() {\n  const [n, setN] = useState(0)\n  console.log('render Parent')\n  useEffect(() => {\n    console.log('effect Parent')\n    return () => console.log('cleanup Parent')\n  })\n  return (\n    <>\n      <Child />\n      <button onClick={() => setN(n + 1)}>+</button>\n    </>\n  )\n}\n\nconst view = render(<Parent />)\nconsole.log('— клик —')\nclick(view.get('button'))",
    "output": [
      "render Parent",
      "render Child",
      "effect Child",
      "effect Parent",
      "— клик —",
      "render Parent",
      "render Child",
      "cleanup Child",
      "cleanup Parent",
      "effect Child",
      "effect Parent"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ:** `render Parent`, `render Child`, `effect Child`, `effect Parent`, `— клик —`, `render Parent`, `render Child`, `cleanup Child`, `cleanup Parent`, `effect Child`, `effect Parent`.\n\n- Рендер идёт сверху вниз: родитель, потом ребёнок.\n- Эффекты — после того, как всё дерево отрисовано, и **снизу вверх**: сначала ребёнок, потом родитель. Поэтому в эффекте родителя DOM детей уже готов.\n- При обновлении React сначала выполняет **все** очистки прошлого рендера, а потом все новые эффекты.\n- Эффект без массива зависимостей перезапускается после каждого рендера. Ребёнок перерисовался вместе с родителем, хотя его пропсы не менялись: `memo` нет."
  },
  {
    "id": "rp-lazy-init",
    "set": "react-p",
    "env": "react",
    "kind": "predict",
    "fn": "",
    "title": "useState(init()) и useState(() => init())",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`. `render` и `click` здесь — помощники тренажёра: смонтировать компонент и нажать кнопку.",
    "code": "function init() {\n  console.log('init')\n  return 0\n}\n\nfunction Box() {\n  const [a, setA] = useState(init())\n  const [b] = useState(() => init())\n  console.log('render', a)\n  return <button onClick={() => setA(a + 1)}>{a + b}</button>\n}\n\nconst view = render(<Box />)\nclick(view.get('button'))",
    "output": [
      "init",
      "init",
      "render 0",
      "init",
      "render 1"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ:** `init`, `init`, `render 0`, `init`, `render 1`.\n\n- `useState(init())` вызывает `init` **на каждом рендере**: это обычный вызов функции до передачи результата в хук. React использует результат только в первый раз, а дальше выбрасывает, но работа уже сделана.\n- `useState(() => init())` — ленивая инициализация: React вызовет функцию только на первом рендере.\n- Поэтому дорогие начальные значения (чтение `localStorage`, разбор большого JSON) передают функцией."
  },
  {
    "id": "rp-ref",
    "set": "react-p",
    "env": "react",
    "kind": "predict",
    "fn": "",
    "title": "useRef не вызывает рендер",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`. `render` и `click` здесь — помощники тренажёра: смонтировать компонент и нажать кнопку.",
    "code": "function Clicks() {\n  const clicks = useRef(0)\n  const [, force] = useState(0)\n  console.log('render', clicks.current)\n  return (\n    <>\n      <button onClick={() => { clicks.current += 1 }}>ref</button>\n      <button onClick={() => force((n) => n + 1)}>state</button>\n    </>\n  )\n}\n\nconst view = render(<Clicks />)\nclick(view.all('button')[0])\nclick(view.all('button')[0])\nclick(view.all('button')[1])",
    "output": [
      "render 0",
      "render 2"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `render 0`, `render 2`.**\n\n- Изменение `ref.current` не вызывает рендер: React не следит за ref. Два клика по первой кнопке ничего не выводят.\n- Значение при этом сохраняется между рендерами. Как только рендер случился по другой причине — смена состояния, — видно `2`.\n- Правило: в ref хранят то, что не показывается на экране — id таймера, DOM-элемент, прошлое значение. Всё, что влияет на разметку, — в состояние."
  },
  {
    "id": "rp-stale-closure",
    "set": "react-p",
    "env": "react",
    "kind": "predict",
    "fn": "",
    "title": "Устаревшее замыкание в setTimeout",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`. `render` и `click` здесь — помощники тренажёра: смонтировать компонент и нажать кнопку.",
    "code": "function Message() {\n  const [text, setText] = useState('привет')\n\n  function send() {\n    setTimeout(() => console.log('отправлено:', text), 50)\n  }\n\n  return (\n    <>\n      <button onClick={send}>Отправить</button>\n      <input value={text} onChange={(e) => setText(e.target.value)} />\n    </>\n  )\n}\n\nconst view = render(<Message />)\nclick(view.get('button'))\ntype(view.get('input'), 'пока')\nawait wait(100)\nconsole.log('на экране:', view.get('input').props.value)",
    "output": [
      "отправлено: привет",
      "на экране: пока"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ:** `отправлено: привет`, затем `на экране: пока`.\n\n- Каждый рендер — отдельный «снимок»: свои пропсы, своё состояние и свои функции. `send` из первого рендера замкнута на `text = 'привет'`.\n- Таймер сработал уже после того, как текст изменился, но видит переменную своего рендера, а не текущее значение.\n- Нужно свежее значение в отложенном колбэке — читать его из `ref`, который обновляется на каждом рендере, или передавать значение в момент вызова.\n- Это поведение — не ошибка React, а замыкания JavaScript. На интервью его спрашивают как «stale closure»."
  },
  {
    "id": "all-settled",
    "set": "d1",
    "fn": "promiseAllSettled",
    "title": "Свой Promise.allSettled",
    "card": null,
    "statement": "Напиши `promiseAllSettled(items)` — свою версию `Promise.allSettled`.\n\n- Возвращает промис, который **никогда не отклоняется**: он ждёт, пока завершится каждый элемент.\n- Результат — массив в исходном порядке. Для выполненного: `{ status: 'fulfilled', value }`, для отклонённого: `{ status: 'rejected', reason }`.\n- В массиве могут быть и обычные значения.\n- Пустой массив → `[]`.\n\nВстроенный `Promise.allSettled` не используй.",
    "starter": "function promiseAllSettled(items) {\n  \n}\n",
    "tests": [
      {
        "label": "порядок исходный, ошибки не роняют результат",
        "script": "async (fn, sleep) => {\n  const broken = Promise.reject(new Error('б'))\n  broken.catch(() => {})\n  const r = await fn([sleep(40).then(() => 'а'), broken, 3])\n  return r.map((x) => (x.status === 'fulfilled' ? ['ok', x.value] : ['err', x.reason && x.reason.message]))\n}",
        "expected": [
          [
            "ok",
            "а"
          ],
          [
            "err",
            "б"
          ],
          [
            "ok",
            3
          ]
        ]
      },
      {
        "label": "форма записи для выполненного",
        "script": "async (fn) => fn([Promise.resolve(1)])",
        "expected": [
          {
            "status": "fulfilled",
            "value": 1
          }
        ]
      },
      {
        "label": "ждёт всех, даже если первый отклонён сразу",
        "script": "async (fn, sleep) => {\n  let finished = false\n  const broken = Promise.reject(new Error('e'))\n  broken.catch(() => {})\n  const slow = sleep(60).then(() => { finished = true; return 'x' })\n  const r = await fn([broken, slow])\n  return [finished, r.length]\n}",
        "expected": [
          true,
          2
        ]
      },
      {
        "label": "пустой массив",
        "script": "async (fn) => fn([])",
        "expected": []
      },
      {
        "label": "сам промис не отклоняется",
        "script": "async (fn) => {\n  const broken = Promise.reject(new Error('x'))\n  broken.catch(() => {})\n  try {\n    await fn([broken])\n    return 'не отклонился'\n  } catch (e) {\n    return 'отклонился'\n  }\n}",
        "expected": "не отклонился"
      }
    ],
    "solution": "function promiseAllSettled(items) {\n  return new Promise((resolve) => {\n    const results = new Array(items.length)\n    let left = items.length\n    if (left === 0) return resolve(results)\n\n    items.forEach((item, i) => {\n      Promise.resolve(item)\n        .then(\n          (value) => { results[i] = { status: 'fulfilled', value } },\n          (reason) => { results[i] = { status: 'rejected', reason } },\n        )\n        // Второй then — уже после записи результата, успешного или нет\n        .then(() => {\n          left -= 1\n          if (left === 0) resolve(results)\n        })\n    })\n  })\n}"
  },
  {
    "id": "retry",
    "set": "d1",
    "fn": "retry",
    "title": "Повтор запроса: retry",
    "card": null,
    "statement": "Напиши `retry(fn, attempts, delay = 0)`: вызывает асинхронную функцию `fn` и при ошибке пробует снова.\n\n- Всего не больше `attempts` попыток, первая тоже считается.\n- Первый успех — промис выполняется этим значением, и `fn` больше не вызывается.\n- Упали все попытки — промис отклоняется **ошибкой последней попытки**.\n- `delay` — пауза в миллисекундах между попытками.\n\nТак повторяют запрос к нестабильному API.",
    "starter": "async function retry(fn, attempts, delay = 0) {\n  \n}\n",
    "tests": [
      {
        "label": "успех с третьей попытки",
        "script": "async (fn) => {\n  let calls = 0\n  const v = await fn(async () => {\n    calls++\n    if (calls < 3) throw new Error('сбой ' + calls)\n    return 'ок'\n  }, 5)\n  return [v, calls]\n}",
        "expected": [
          "ок",
          3
        ]
      },
      {
        "label": "успех сразу — один вызов",
        "script": "async (fn) => {\n  let calls = 0\n  const v = await fn(async () => { calls++; return 'сразу' }, 3)\n  return [v, calls]\n}",
        "expected": [
          "сразу",
          1
        ]
      },
      {
        "label": "все упали — ошибка последней попытки",
        "script": "async (fn) => {\n  let calls = 0\n  try {\n    await fn(async () => { calls++; throw new Error('сбой ' + calls) }, 3)\n    return 'не отклонился'\n  } catch (e) {\n    return [e.message, calls]\n  }\n}",
        "expected": [
          "сбой 3",
          3
        ]
      },
      {
        "label": "attempts = 1 — без повторов",
        "script": "async (fn) => {\n  let calls = 0\n  try {\n    await fn(async () => { calls++; throw new Error('a') }, 1)\n  } catch (e) {\n    return calls\n  }\n  return 'не отклонился'\n}",
        "expected": 1
      },
      {
        "label": "между попытками пауза delay",
        "script": "async (fn) => {\n  const times = []\n  const start = Date.now()\n  try {\n    await fn(async () => { times.push(Date.now() - start); throw new Error('x') }, 3, 40)\n  } catch (e) {}\n  return [times.length, times[1] >= 35, times[2] >= 75]\n}",
        "expected": [
          3,
          true,
          true
        ]
      }
    ],
    "solution": "async function retry(fn, attempts, delay = 0) {\n  let lastError\n  for (let i = 0; i < attempts; i++) {\n    try {\n      // await внутри try: без него отклонённый промис пролетел бы мимо catch\n      return await fn()\n    } catch (err) {\n      lastError = err\n      if (i < attempts - 1 && delay > 0) {\n        await new Promise((resolve) => setTimeout(resolve, delay))\n      }\n    }\n  }\n  throw lastError\n}"
  },
  {
    "id": "limit-pool",
    "set": "d1",
    "fn": "runWithLimit",
    "title": "Не больше N запросов разом",
    "card": null,
    "statement": "`tasks` — массив функций без аргументов, каждая возвращает промис (например, запрос на сервер). Напиши `runWithLimit(tasks, limit)`:\n\n- одновременно выполняется не больше `limit` задач;\n- как только одна завершилась, сразу запускается следующая из очереди. Пачками по `limit` — не годится: пачка ждёт самую медленную;\n- результат — промис с массивом результатов **в исходном порядке**;\n- можно считать, что задачи не падают;\n- пустой массив → `[]`.\n\nТак ограничивают число параллельных запросов при загрузке сотни картинок или файлов.",
    "starter": "function runWithLimit(tasks, limit) {\n  \n}\n",
    "tests": [
      {
        "label": "результаты в исходном порядке",
        "script": "async (fn, sleep) => {\n  const tasks = [50, 10, 30, 20].map((ms, i) => () => sleep(ms).then(() => i))\n  return fn(tasks, 2)\n}",
        "expected": [
          0,
          1,
          2,
          3
        ]
      },
      {
        "label": "одновременно не больше limit",
        "script": "async (fn, sleep) => {\n  let active = 0\n  let max = 0\n  const tasks = Array.from({ length: 6 }, (_, i) => async () => {\n    active++\n    max = Math.max(max, active)\n    await sleep(20 + (i % 3) * 10)\n    active--\n    return i\n  })\n  await fn(tasks, 3)\n  return max\n}",
        "expected": 3
      },
      {
        "label": "следующая стартует сразу, а не ждёт всю пачку",
        "script": "async (fn, sleep) => {\n  const start = Date.now()\n  const starts = []\n  const tasks = [100, 20, 20, 20].map((ms, i) => () => {\n    starts[i] = Date.now() - start\n    return sleep(ms).then(() => i)\n  })\n  await fn(tasks, 2)\n  return [starts[2] < 60, starts[3] < 80]\n}",
        "expected": [
          true,
          true
        ]
      },
      {
        "label": "пустой массив",
        "script": "async (fn) => fn([], 3)",
        "expected": []
      },
      {
        "label": "limit больше числа задач",
        "script": "async (fn) => fn([() => Promise.resolve('а')], 5)",
        "expected": [
          "а"
        ]
      }
    ],
    "solution": "function runWithLimit(tasks, limit) {\n  return new Promise((resolve) => {\n    const results = new Array(tasks.length)\n    let next = 0 // какую задачу запускать следующей\n    let finished = 0\n    if (tasks.length === 0) return resolve(results)\n\n    function startNext() {\n      const i = next++\n      tasks[i]().then((value) => {\n        results[i] = value // по индексу: порядок исходный, а не порядок завершения\n        finished += 1\n        if (finished === tasks.length) resolve(results)\n        else if (next < tasks.length) startNext()\n      })\n    }\n\n    // Сначала limit задач, дальше каждая завершившаяся запускает следующую\n    for (let k = 0; k < Math.min(limit, tasks.length); k++) startNext()\n  })\n}"
  },
  {
    "id": "throttle",
    "set": "d1",
    "fn": "throttle",
    "title": "throttle",
    "card": null,
    "statement": "Напиши `throttle(fn, ms)`: возвращает обёртку, которая вызывает `fn` не чаще раза в `ms` миллисекунд.\n\n- Первый вызов обёртки вызывает `fn` **сразу**.\n- Вызовы в течение `ms` после него игнорируются.\n- Прошло `ms` — следующий вызов снова срабатывает сразу.\n- `fn` получает аргументы и `this` того вызова, который сработал.\n\nОтличие от `debounce`: тот ждёт паузы, а `throttle` пропускает вызовы равномерно. Типичное применение — обработчик `scroll` или `resize`.",
    "starter": "function throttle(fn, ms) {\n  \n}\n",
    "tests": [
      {
        "label": "первый вызов — сразу",
        "script": "(fn) => {\n  const calls = []\n  const t = fn((x) => calls.push(x), 50)\n  t(1)\n  return calls\n}",
        "expected": [
          1
        ]
      },
      {
        "label": "вызовы внутри интервала игнорируются",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const t = fn((x) => calls.push(x), 60)\n  t(1); t(2)\n  await sleep(20)\n  t(3)\n  await sleep(80)\n  return calls\n}",
        "expected": [
          1
        ]
      },
      {
        "label": "после интервала снова срабатывает",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const t = fn((x) => calls.push(x), 40)\n  t(1)\n  await sleep(70)\n  t(2)\n  return calls\n}",
        "expected": [
          1,
          2
        ]
      },
      {
        "label": "поток вызовов каждые 20 мс за 200 мс при ms = 100 → 2–3 срабатывания",
        "script": "async (fn, sleep) => {\n  let n = 0\n  const t = fn(() => n++, 100)\n  for (let i = 0; i < 10; i++) {\n    t()\n    await sleep(20)\n  }\n  return n >= 2 && n <= 3\n}",
        "expected": true
      },
      {
        "label": "this и аргументы сохраняются",
        "script": "(fn) => {\n  const seen = []\n  const obj = { k: 5 }\n  obj.m = fn(function (a) { seen.push(this.k + a) }, 50)\n  obj.m(1)\n  return seen\n}",
        "expected": [
          6
        ]
      }
    ],
    "solution": "function throttle(fn, ms) {\n  let waiting = false\n  return function (...args) {\n    if (waiting) return\n    fn.apply(this, args)\n    waiting = true\n    setTimeout(() => {\n      waiting = false\n    }, ms)\n  }\n}"
  },
  {
    "id": "my-bind",
    "set": "d1",
    "fn": "myBind",
    "title": "Свой bind",
    "card": null,
    "statement": "Напиши `myBind(fn, context, ...args)` — аналог `fn.bind(context, ...args)`, **без** `bind`.\n\n- Возвращает новую функцию. При её вызове `fn` выполняется с `this === context`.\n- Аргументы склеиваются: сначала переданные в `myBind`, потом в сам вызов.\n- Возвращает результат `fn`.\n- Вызов через `call` или как метод другого объекта `this` не меняет.\n\nПро вызов через `new` можно не думать.",
    "starter": "function myBind(fn, context, ...args) {\n  \n}\n",
    "tests": [
      {
        "label": "this — переданный объект",
        "script": "(fn) => {\n  const user = { name: 'Аня' }\n  function hi() { return 'Привет, ' + this.name }\n  return fn(hi, user)()\n}",
        "expected": "Привет, Аня"
      },
      {
        "label": "частичное применение аргументов",
        "script": "(fn) => {\n  function sum(a, b, c) { return a + b + c }\n  return fn(sum, null, 1, 2)(3)\n}",
        "expected": 6
      },
      {
        "label": "call и вызов как метода не меняют this",
        "script": "(fn) => {\n  const a = { x: 1 }\n  const b = { x: 2 }\n  const f = fn(function () { return this.x }, a)\n  b.f = f\n  return [f(), b.f(), f.call(b)]\n}",
        "expected": [
          1,
          1,
          1
        ]
      },
      {
        "label": "работает без встроенного bind",
        "script": "(fn) => {\n  const original = Function.prototype.bind\n  Function.prototype.bind = function () { throw new Error('bind использовать нельзя') }\n  try {\n    return fn(function (p) { return p + this.v }, { v: '!' })('ок')\n  } finally {\n    Function.prototype.bind = original\n  }\n}",
        "expected": "ок!"
      }
    ],
    "solution": "function myBind(fn, context, ...bound) {\n  return function (...args) {\n    // apply сам задаёт this; снаружи его уже не переопределить\n    return fn.apply(context, [...bound, ...args])\n  }\n}"
  },
  {
    "id": "p-loop-nested",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "Таймеры внутри промисов и наоборот",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "console.log('A')\nsetTimeout(() => {\n  console.log('B')\n  Promise.resolve().then(() => console.log('C'))\n}, 0)\nPromise.resolve().then(() => {\n  console.log('D')\n  setTimeout(() => console.log('E'), 0)\n})\nconsole.log('F')",
    "output": [
      "A",
      "F",
      "D",
      "B",
      "C",
      "E"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: A F D B C E.**\n\n1. Синхронный код: `A`, `F`. Таймер `B` встал в очередь макрозадач, `then` с `D` — в очередь микрозадач.\n2. Стек пуст — выполняются **все** микрозадачи: `D`. Он ставит таймер `E` в конец очереди макрозадач, после `B`.\n3. Первая макрозадача — таймер `B`. Он ставит микрозадачу `C`.\n4. После каждой макрозадачи снова разбираются все микрозадачи: `C`.\n5. Следующая макрозадача: `E`.\n\nПравило для ответа вслух: «одна макрозадача — потом все микрозадачи — потом следующая макрозадача»."
  },
  {
    "id": "p-await-order",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "async-функция и await",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "async function first() {\n  console.log(1)\n  await second()\n  console.log(2)\n}\nasync function second() {\n  console.log(3)\n}\nconsole.log(4)\nfirst()\nPromise.resolve().then(() => console.log(5))\nconsole.log(6)",
    "output": [
      "4",
      "1",
      "3",
      "6",
      "2",
      "5"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: 4 1 3 6 2 5.**\n\n- Вызов async-функции выполняется **синхронно** до первого `await`: печатается `1`, затем синхронно выполняется `second()` и печатает `3`.\n- Всё, что после `await`, становится микрозадачей. Она поставлена в очередь раньше, чем `then` с `5`, потому что `first()` вызвана раньше.\n- Дальше синхронный `6`, затем микрозадачи по очереди: `2`, `5`.\n\nЧастая ошибка — думать, что async-функция целиком асинхронная и `1` напечатается после `6`."
  },
  {
    "id": "p-chain-catch",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "Цепочка промисов с ошибкой",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "Promise.resolve(1)\n  .then((x) => {\n    console.log(x)\n    throw new Error('ой')\n  })\n  .then(() => console.log('пропущен'))\n  .catch((e) => {\n    console.log(e.message)\n    return 2\n  })\n  .then((x) => console.log(x))\n  .finally(() => console.log('конец'))",
    "output": [
      "1",
      "ой",
      "2",
      "конец"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: 1, ой, 2, конец.**\n\n- `throw` внутри `then` делает следующий промис цепочки отклонённым.\n- `then` без обработчика ошибки пропускается: отклонение идёт дальше по цепочке.\n- `catch` ловит ошибку и **возвращает значение** — цепочка снова в состоянии «выполнено», следующий `then` получает `2`.\n- `finally` вызывается в любом случае и аргументов не получает.\n\nВывод для интервью: `catch` не конец цепочки, а обычный обработчик; что он вернёт, то и пойдёт дальше."
  },
  {
    "id": "p-class-this",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "this в методе и в стрелке класса",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "class Timer {\n  name = 'таймер'\n  regular() {\n    return this?.name\n  }\n  arrow = () => this.name\n}\nconst t = new Timer()\nconst { regular, arrow } = t\nconsole.log(t.regular())\nconsole.log(arrow())\nconsole.log(regular())",
    "output": [
      "таймер",
      "таймер",
      "undefined"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: таймер, таймер, undefined.**\n\n- `this` обычного метода определяется **в момент вызова**: что стоит слева от точки. `t.regular()` — `this` это `t`.\n- После деструктуризации `regular()` вызвана без объекта. Код класса всегда в строгом режиме, поэтому `this === undefined`. Без `?.` здесь был бы `TypeError`.\n- Стрелочная функция-поле создаётся в конструкторе и берёт `this` из него — навсегда. Поэтому `arrow()` работает и в отрыве от объекта.\n\nОтсюда практика: колбэк, который передают «на сторону» (в обработчик события, в `setTimeout`), пишут стрелкой или привязывают через `bind`."
  },
  {
    "id": "p-bind-twice",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "bind, call и снова bind",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "function getX() {\n  return this.x\n}\nconst a = { x: 1 }\nconst b = { x: 2 }\nconst bound = getX.bind(a)\nconsole.log(bound.call(b))\nconsole.log(bound.bind(b)())\nconsole.log(getX.call(b))",
    "output": [
      "1",
      "1",
      "2"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: 1 1 2.**\n\n- `bind` возвращает новую функцию с **жёстко зашитым** `this`. `call` и `apply` его уже не переопределяют.\n- Повторный `bind` тоже не меняет `this` — он может только добавить аргументы.\n- У исходной `getX` ничего не зашито, поэтому `call(b)` даёт `2`.\n\nПорядок приоритета `this`: `new` → `bind` → `call`/`apply` → вызов как метода → обычный вызов (`undefined` в строгом режиме). Стрелки в этой лестнице не участвуют: у них `this` из места создания."
  },
  {
    "id": "p-counter",
    "set": "d1p",
    "kind": "predict",
    "fn": "",
    "title": "Два счётчика на замыканиях",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "function makeCounter() {\n  let count = 0\n  return {\n    inc: () => ++count,\n    get: () => count,\n  }\n}\nconst c1 = makeCounter()\nconst c2 = makeCounter()\nc1.inc()\nc1.inc()\nc2.inc()\nconsole.log(c1.get(), c2.get())\nconsole.log(c1.inc === c2.inc)",
    "output": [
      "2 1",
      "false"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `2 1`, затем `false`.**\n\n- Каждый вызов `makeCounter` создаёт **новое** лексическое окружение со своей переменной `count`.\n- `inc` и `get` одного счётчика замкнуты на одно и то же окружение, поэтому видят общий `count`.\n- Функции `c1.inc` и `c2.inc` созданы разными вызовами — это разные объекты.\n\nТак в JavaScript делают приватное состояние без классов. Composable во Vue устроен так же: каждый вызов `useCounter()` даёт свой `ref`."
  },
  {
    "id": "group-anagrams",
    "set": "d2",
    "fn": "groupAnagrams",
    "title": "Сгруппировать анаграммы",
    "card": null,
    "statement": "Напиши `groupAnagrams(words)`: группирует слова, состоящие из одних и тех же букв.\n\n- Результат — массив групп. Группы идут в порядке первого появления, слова внутри — в исходном порядке.\n- Повторы слов сохраняются.\n- Регистр учитывается.\n\nПример: `['eat', 'tea', 'tan', 'ate', 'nat', 'bat']` → `[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]`.\n\nНа интервью спросят сложность — подумай о ней заранее.",
    "starter": "function groupAnagrams(words) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            "eat",
            "tea",
            "tan",
            "ate",
            "nat",
            "bat"
          ]
        ],
        "expected": [
          [
            "eat",
            "tea",
            "ate"
          ],
          [
            "tan",
            "nat"
          ],
          [
            "bat"
          ]
        ]
      },
      {
        "args": [
          []
        ],
        "expected": []
      },
      {
        "args": [
          [
            "a"
          ]
        ],
        "expected": [
          [
            "a"
          ]
        ]
      },
      {
        "args": [
          [
            "abc",
            "bca",
            "cab",
            "abc"
          ]
        ],
        "expected": [
          [
            "abc",
            "bca",
            "cab",
            "abc"
          ]
        ]
      },
      {
        "args": [
          [
            "ab",
            "ba",
            "abc"
          ]
        ],
        "expected": [
          [
            "ab",
            "ba"
          ],
          [
            "abc"
          ]
        ]
      }
    ],
    "solution": "function groupAnagrams(words) {\n  // Ключ — буквы слова по алфавиту: у анаграмм он одинаковый.\n  // Map помнит порядок вставки, отсюда порядок групп\n  const groups = new Map()\n  for (const word of words) {\n    const key = [...word].sort().join('')\n    if (!groups.has(key)) groups.set(key, [])\n    groups.get(key).push(word)\n  }\n  return [...groups.values()]\n}\n// Сложность: O(n · k log k), n — число слов, k — длина слова (сортировка букв)"
  },
  {
    "id": "longest-unique",
    "set": "d2",
    "fn": "lengthOfLongestUnique",
    "title": "Самая длинная подстрока без повторов",
    "card": null,
    "statement": "Напиши `lengthOfLongestUnique(s)`: длина самой длинной подстроки, в которой нет повторяющихся символов.\n\n- `'abcabcbb'` → `3` (`'abc'`)\n- `'bbbbb'` → `1`\n- `'pwwkew'` → `3` (`'wke'`)\n- `''` → `0`\n\nПопробуй решить за один проход — техникой «скользящего окна». Перебор всех подстрок тоже пройдёт тесты, но на интервью сразу спросят, как сделать быстрее.",
    "starter": "function lengthOfLongestUnique(s) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "abcabcbb"
        ],
        "expected": 3
      },
      {
        "args": [
          "bbbbb"
        ],
        "expected": 1
      },
      {
        "args": [
          "pwwkew"
        ],
        "expected": 3
      },
      {
        "args": [
          ""
        ],
        "expected": 0
      },
      {
        "args": [
          "abcdef"
        ],
        "expected": 6
      },
      {
        "args": [
          "abba"
        ],
        "expected": 2,
        "label": "'abba' — прошлое вхождение левее окна"
      },
      {
        "args": [
          "dvdf"
        ],
        "expected": 3
      }
    ],
    "solution": "function lengthOfLongestUnique(s) {\n  const lastSeen = new Map() // символ → индекс последнего вхождения\n  let start = 0 // левая граница окна без повторов\n  let best = 0\n  for (let i = 0; i < s.length; i++) {\n    const ch = s[i]\n    // Повтор внутри окна — переносим левую границу за прошлое вхождение.\n    // Math.max: прошлое вхождение могло остаться левее окна ('abba')\n    if (lastSeen.has(ch)) start = Math.max(start, lastSeen.get(ch) + 1)\n    lastSeen.set(ch, i)\n    best = Math.max(best, i - start + 1)\n  }\n  return best\n}\n// Один проход: O(n) по времени, O(размер алфавита) по памяти"
  },
  {
    "id": "deep-equal",
    "set": "d2",
    "fn": "deepEqual",
    "title": "Глубокое сравнение",
    "card": null,
    "statement": "Напиши `deepEqual(a, b)`: сравнивает значения по содержимому.\n\n- Примитивы — как `===`, но `NaN` равен `NaN`.\n- Массивы равны, если равны длины и элементы на одинаковых местах.\n- Объекты равны, если у них один и тот же набор ключей и равные значения. Порядок ключей не важен.\n- Массив и объект с теми же ключами не равны. `null` равен только `null`.",
    "starter": "function deepEqual(a, b) {\n  \n}\n",
    "tests": [
      {
        "args": [
          1,
          1
        ],
        "expected": true
      },
      {
        "args": [
          1,
          "1"
        ],
        "expected": false
      },
      {
        "label": "NaN и NaN",
        "script": "(fn) => fn(NaN, NaN)",
        "expected": true
      },
      {
        "args": [
          {
            "a": 1,
            "b": {
              "c": [
                1,
                2
              ]
            }
          },
          {
            "b": {
              "c": [
                1,
                2
              ]
            },
            "a": 1
          }
        ],
        "expected": true
      },
      {
        "label": "{ a: 1 } и { a: 1, b: undefined }",
        "script": "(fn) => fn({ a: 1 }, { a: 1, b: undefined })",
        "expected": false
      },
      {
        "args": [
          [
            1,
            2
          ],
          [
            1,
            2,
            3
          ]
        ],
        "expected": false
      },
      {
        "args": [
          [],
          {}
        ],
        "expected": false
      },
      {
        "args": [
          null,
          {}
        ],
        "expected": false
      },
      {
        "args": [
          null,
          null
        ],
        "expected": true
      },
      {
        "args": [
          {
            "a": [
              {
                "b": 1
              }
            ]
          },
          {
            "a": [
              {
                "b": 2
              }
            ]
          }
        ],
        "expected": false
      }
    ],
    "solution": "function deepEqual(a, b) {\n  if (a === b) return true\n  if (Number.isNaN(a) && Number.isNaN(b)) return true\n  // Дальше сравниваем только два настоящих объекта\n  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false\n  if (Array.isArray(a) !== Array.isArray(b)) return false\n\n  const keysA = Object.keys(a)\n  const keysB = Object.keys(b)\n  if (keysA.length !== keysB.length) return false\n  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))\n}"
  },
  {
    "id": "curry",
    "set": "d2",
    "fn": "curry",
    "title": "Каррирование",
    "card": null,
    "statement": "Напиши `curry(fn)`: превращает функцию от нескольких аргументов в такую, которую можно вызывать по частям.\n\n```js\nconst add = curry((a, b, c) => a + b + c)\nadd(1)(2)(3)  // 6\nadd(1, 2)(3)  // 6\nadd(1)(2, 3)  // 6\nadd(1, 2, 3)  // 6\n```\n\n- Сколько аргументов ждать — берётся из `fn.length`.\n- Частично применённую функцию можно использовать много раз: `const plus10 = add2(10)`, потом `plus10(1)` и `plus10(5)` независимо.",
    "starter": "function curry(fn) {\n  \n}\n",
    "tests": [
      {
        "label": "все способы вызова",
        "script": "(fn) => {\n  const add = fn((a, b, c) => a + b + c)\n  return [add(1)(2)(3), add(1, 2)(3), add(1)(2, 3), add(1, 2, 3)]\n}",
        "expected": [
          6,
          6,
          6,
          6
        ]
      },
      {
        "label": "частичное применение переиспользуется",
        "script": "(fn) => {\n  const add = fn((a, b) => a + b)\n  const plus10 = add(10)\n  return [plus10(1), plus10(5)]\n}",
        "expected": [
          11,
          15
        ]
      },
      {
        "label": "функция от одного аргумента",
        "script": "(fn) => fn((x) => x * 2)(4)",
        "expected": 8
      }
    ],
    "solution": "function curry(fn) {\n  return function curried(...args) {\n    // Набрали столько аргументов, сколько объявлено у fn, — вызываем\n    if (args.length >= fn.length) return fn(...args)\n    // Иначе — функция, которая допишет остальные. Новый массив на каждый\n    // вызов: поэтому частичное применение можно переиспользовать\n    return (...more) => curried(...args, ...more)\n  }\n}"
  },
  {
    "id": "event-emitter",
    "set": "d2",
    "fn": "EventEmitter",
    "title": "EventEmitter на классе",
    "card": null,
    "statement": "Напиши класс `EventEmitter` — подписка на события.\n\n- `on(event, handler)` подписывает обработчик и **возвращает функцию отписки** (удобно в `onUnmounted`).\n- `emit(event, ...args)` вызывает обработчики события в порядке подписки с этими аргументами. Возвращает `true`, если обработчики были, иначе `false`.\n- `off(event, handler)` отписывает этот обработчик.\n- `once(event, handler)` — обработчик сработает один раз и отпишется сам.\n- У каждого экземпляра свои подписки.\n\nПодвох, о котором спросят: обработчик может отписаться прямо во время `emit`.",
    "starter": "class EventEmitter {\n  \n}\n",
    "tests": [
      {
        "label": "порядок и аргументы",
        "script": "(E) => {\n  const e = new E()\n  const log = []\n  e.on('save', (a, b) => log.push('1:' + a + b))\n  e.on('save', (a) => log.push('2:' + a))\n  e.emit('save', 'x', 'y')\n  return log\n}",
        "expected": [
          "1:xy",
          "2:x"
        ]
      },
      {
        "label": "emit возвращает, были ли обработчики",
        "script": "(E) => {\n  const e = new E()\n  e.on('a', () => {})\n  return [e.emit('a'), e.emit('b')]\n}",
        "expected": [
          true,
          false
        ]
      },
      {
        "label": "off отписывает только этот обработчик",
        "script": "(E) => {\n  const e = new E()\n  const log = []\n  const h = () => log.push('h')\n  e.on('a', h)\n  e.on('a', () => log.push('other'))\n  e.off('a', h)\n  e.emit('a')\n  return log\n}",
        "expected": [
          "other"
        ]
      },
      {
        "label": "on возвращает функцию отписки",
        "script": "(E) => {\n  const e = new E()\n  let n = 0\n  const stop = e.on('a', () => n++)\n  e.emit('a')\n  stop()\n  e.emit('a')\n  return n\n}",
        "expected": 1
      },
      {
        "label": "once срабатывает один раз",
        "script": "(E) => {\n  const e = new E()\n  let n = 0\n  e.once('a', () => n++)\n  e.emit('a')\n  e.emit('a')\n  return [n, e.emit('a')]\n}",
        "expected": [
          1,
          false
        ]
      },
      {
        "label": "отписка во время emit не пропускает следующий обработчик",
        "script": "(E) => {\n  const e = new E()\n  const log = []\n  const first = () => { log.push(1); e.off('a', first) }\n  e.on('a', first)\n  e.on('a', () => log.push(2))\n  e.emit('a')\n  e.emit('a')\n  return log\n}",
        "expected": [
          1,
          2,
          2
        ]
      },
      {
        "label": "подписки разных экземпляров не смешиваются",
        "script": "(E) => {\n  const a = new E()\n  const b = new E()\n  let n = 0\n  a.on('x', () => n++)\n  b.emit('x')\n  return n\n}",
        "expected": 0
      }
    ],
    "solution": "class EventEmitter {\n  #handlers = new Map() // событие → массив обработчиков\n\n  on(event, handler) {\n    if (!this.#handlers.has(event)) this.#handlers.set(event, [])\n    this.#handlers.get(event).push(handler)\n    return () => this.off(event, handler)\n  }\n\n  off(event, handler) {\n    const list = this.#handlers.get(event)\n    if (!list) return\n    const i = list.indexOf(handler)\n    if (i !== -1) list.splice(i, 1)\n  }\n\n  once(event, handler) {\n    const wrapper = (...args) => {\n      this.off(event, wrapper)\n      handler(...args)\n    }\n    return this.on(event, wrapper)\n  }\n\n  emit(event, ...args) {\n    const list = this.#handlers.get(event)\n    if (!list || list.length === 0) return false\n    // Копия: обработчик может отписаться прямо сейчас (once так и делает),\n    // и сдвиг исходного массива пропустил бы следующий обработчик\n    for (const handler of [...list]) handler(...args)\n    return true\n  }\n}"
  },
  {
    "id": "p-coercion",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "Приведение типов в арифметике",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "console.log(1 + '2')\nconsole.log('5' - 2)\nconsole.log([] + {})\nconsole.log([1, 2] + [3])\nconsole.log(true + 1)\nconsole.log(null + 1, undefined + 1)",
    "output": [
      "12",
      "3",
      "[object Object]",
      "1,23",
      "2",
      "1 NaN"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `12`, `3`, `[object Object]`, `1,23`, `2`, `1 NaN`.**\n\n- `+` со строкой — склейка: `1 + '2'` даёт `'12'`. Остальные арифметические операторы приводят к числу: `'5' - 2` даёт `3`.\n- Объект в арифметике сначала превращается в примитив: `valueOf` примитива не даёт, вызывается `toString`. `[]` → `''`, `{}` → `'[object Object]'`, `[1, 2]` → `'1,2'`. Дальше склейка строк.\n- `true` → `1`, `null` → `0`, `undefined` → `NaN`.\n\nКак отвечать: «сначала оба операнда к примитиву; если хоть один строка — склейка, иначе — к числу»."
  },
  {
    "id": "p-equality",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "Нестрогое равенство и сравнение",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "console.log(null == undefined, null === undefined)\nconsole.log(NaN === NaN, Object.is(NaN, NaN))\nconsole.log(0 == '', '0' == false)\nconsole.log(null == 0, null >= 0)",
    "output": [
      "true false",
      "false true",
      "true true",
      "false true"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `true false`, `false true`, `true true`, `false true`.**\n\n- `null` нестрого равен только `undefined` и самому себе. Поэтому `x == null` — принятый способ проверить «нет значения».\n- `NaN` не равен ничему, даже себе. `Object.is` и `Number.isNaN` это учитывают.\n- `0 == ''` и `'0' == false`: оба операнда приводятся к числу, получается `0 == 0`.\n- Самое коварное: `null == 0` ложно (для `==` у `null` особое правило), а `null >= 0` истинно — операторы сравнения приводят `null` к `0`."
  },
  {
    "id": "p-hoisting",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "Всплытие и временная мёртвая зона",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "console.log(typeof hoisted, typeof declared)\nvar hoisted = 1\nfunction declared() {}\ntry {\n  console.log(later)\n} catch (e) {\n  console.log(e.name)\n}\nlet later = 3\nconsole.log(typeof notDeclaredAnywhere)",
    "output": [
      "undefined function",
      "ReferenceError",
      "undefined"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `undefined function`, `ReferenceError`, `undefined`.**\n\n- `var` всплывает со значением `undefined`: переменная уже есть, но значение присвоится позже.\n- Function Declaration всплывает **целиком** — её можно вызвать до объявления.\n- `let` и `const` тоже всплывают, но до строки объявления находятся во временной мёртвой зоне: обращение даёт `ReferenceError`.\n- `typeof` для необъявленной переменной ошибки не даёт и возвращает `'undefined'`."
  },
  {
    "id": "p-prototype",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "Живой прототип",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "function Animal(name) {\n  this.name = name\n}\nAnimal.prototype.say = function () {\n  return this.name + ' говорит'\n}\nconst cat = new Animal('Кот')\nAnimal.prototype.say = function () {\n  return 'мяу'\n}\nconsole.log(cat.say())\nconsole.log(cat.hasOwnProperty('say'), 'say' in cat)\ncat.say = () => 'своё'\nconsole.log(cat.say(), Object.getPrototypeOf(cat) === Animal.prototype)",
    "output": [
      "мяу",
      "false true",
      "своё true"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `мяу`, `false true`, `своё true`.**\n\n- Метод ищется по цепочке прототипов **в момент вызова**. Прототип общий и живой: его изменение видят даже объекты, созданные раньше.\n- `hasOwnProperty` смотрит только собственные свойства, `in` — всю цепочку.\n- Собственное свойство затеняет одноимённое из прототипа, сама цепочка при этом не меняется.\n\nКлассы устроены так же: методы класса лежат в `Класс.prototype`, а поля — в самом объекте."
  },
  {
    "id": "p-copy",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "Поверхностная и глубокая копия",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const a = { n: 1, list: [1] }\nconst b = { ...a }\nb.n = 2\nb.list.push(2)\nconsole.log(a.n, a.list.length)\nconst c = structuredClone(a)\nc.list.push(3)\nconsole.log(a.list.length, c.list.length)",
    "output": [
      "1 2",
      "2 3"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `1 2`, затем `2 3`.**\n\n- Spread копирует только верхний уровень. `n` — примитив, скопирован значением, поэтому `a.n` остался `1`.\n- `list` — ссылка: `a.list` и `b.list` указывают на один массив, `push` виден через обе переменные.\n- `structuredClone` копирует глубоко: у `c` свой массив, и `a` его изменения не видит.\n\nОграничения `structuredClone`: функции и DOM-узлы он не копирует (бросает ошибку), а у классов теряет прототип. `JSON.parse(JSON.stringify())` теряет ещё больше: `undefined`, `Date`, `Map`."
  },
  {
    "id": "p-array",
    "set": "d2p",
    "kind": "predict",
    "fn": "",
    "title": "sort, slice, splice и map(parseInt)",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const arr = [3, 1, 10, 2]\nconst sorted = arr.sort()\nconsole.log(sorted === arr, arr.join(','))\nconsole.log(arr.slice(1, 2).length, arr.splice(1, 2).length, arr.length)\nconsole.log(['1', '2', '3'].map(parseInt).join(','))",
    "output": [
      "true 1,10,2,3",
      "1 2 2",
      "1,NaN,NaN"
    ],
    "starter": "",
    "tests": [],
    "solution": "**Ответ: `true 1,10,2,3`, `1 2 2`, `1,NaN,NaN`.**\n\n- `sort` **меняет** массив и возвращает его же. Без функции сравнения сравнивает элементы как строки, поэтому `'10'` встаёт раньше `'2'`. Для чисел: `sort((a, b) => a - b)`.\n- `slice(1, 2)` копирует один элемент и массив не трогает. `splice(1, 2)` вырезает два элемента — массив стал короче.\n- `map` передаёт в колбэк `(значение, индекс)`, а `parseInt` второй аргумент понимает как основание системы счисления: `parseInt('1', 0)` → `1` (0 — «по умолчанию»), `parseInt('2', 1)` → `NaN`, `parseInt('3', 2)` → `NaN`. Правильно: `.map(Number)`."
  },
  {
    "id": "vue-form",
    "set": "d3",
    "fn": "useForm",
    "title": "Composable формы с валидацией",
    "card": null,
    "statement": "Напиши composable `useForm(initial, rules)`.\n\n- `values` — `reactive`-копия `initial`. Сам `initial` не меняется.\n- `rules` — объект `{ поле: [правило, …] }`. Правило — функция `(value, values) => true | 'текст ошибки'`; второй аргумент нужен для правил вроде «пароли совпадают».\n- `errors` — `computed`: объект `{ поле: 'текст первой ошибки' }` по всем полям из `rules`, для поля без ошибок — `''`.\n- `isValid` — `computed`: `true`, если ошибок нет.\n- `submit(handler)` — если форма валидна, вызывает `handler` с **обычным объектом** (копией значений, не прокси) и возвращает его результат. Если нет — `handler` не вызывает и возвращает `false`.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useForm(initial, rules) {\n  \n}\n",
    "tests": [
      {
        "label": "ошибка первого правила",
        "script": "(fn) => {\n  const f = fn({ email: '' }, {\n    email: [(v) => !!v || 'Обязательное поле', (v) => v.includes('@') || 'Нужен @'],\n  })\n  return [f.errors.value.email, f.isValid.value]\n}",
        "expected": [
          "Обязательное поле",
          false
        ]
      },
      {
        "label": "ошибки пересчитываются при вводе",
        "script": "(fn) => {\n  const f = fn({ email: '' }, {\n    email: [(v) => !!v || 'Обязательное поле', (v) => v.includes('@') || 'Нужен @'],\n  })\n  f.values.email = 'aaa'\n  const second = f.errors.value.email\n  f.values.email = 'a@b'\n  return [second, f.errors.value.email, f.isValid.value]\n}",
        "expected": [
          "Нужен @",
          "",
          true
        ]
      },
      {
        "label": "правило видит все значения формы",
        "script": "(fn) => {\n  const f = fn({ password: '123', confirm: '12' }, {\n    confirm: [(v, all) => v === all.password || 'Пароли не совпадают'],\n  })\n  const before = f.errors.value.confirm\n  f.values.confirm = '123'\n  return [before, f.errors.value.confirm]\n}",
        "expected": [
          "Пароли не совпадают",
          ""
        ]
      },
      {
        "label": "невалидная форма не отправляется",
        "script": "(fn) => {\n  let called = false\n  const f = fn({ name: '' }, { name: [(v) => !!v || 'Пусто'] })\n  const r = f.submit(() => { called = true })\n  return [r, called]\n}",
        "expected": [
          false,
          false
        ]
      },
      {
        "label": "submit отдаёт обычный объект и результат handler",
        "script": "(fn, sleep, t) => {\n  let got\n  const f = fn({ name: 'Аня' }, { name: [(v) => !!v || 'Пусто'] })\n  const r = f.submit((v) => { got = v; return 'отправлено' })\n  f.values.name = 'Оля'\n  return [r, got.name, t.isReactive(got)]\n}",
        "expected": [
          "отправлено",
          "Аня",
          false
        ]
      },
      {
        "label": "initial не меняется",
        "script": "(fn) => {\n  const init = { name: 'a' }\n  const f = fn(init, {})\n  f.values.name = 'b'\n  return [init.name, f.isValid.value]\n}",
        "expected": [
          "a",
          true
        ]
      }
    ],
    "solution": "function useForm(initial, rules) {\n  const values = reactive({ ...initial })\n\n  const errors = computed(() => {\n    const result = {}\n    for (const [field, checks] of Object.entries(rules)) {\n      result[field] = ''\n      for (const check of checks) {\n        const verdict = check(values[field], values)\n        if (verdict !== true) {\n          result[field] = verdict\n          break // показываем первую ошибку поля\n        }\n      }\n    }\n    return result\n  })\n\n  const isValid = computed(() => Object.values(errors.value).every((e) => e === ''))\n\n  function submit(handler) {\n    if (!isValid.value) return false\n    return handler({ ...values }) // обычный объект, а не прокси формы\n  }\n\n  return { values, errors, isValid, submit }\n}",
    "env": "vue"
  },
  {
    "id": "vue-storage",
    "set": "d3",
    "fn": "useStorage",
    "title": "ref, который живёт в localStorage",
    "card": null,
    "statement": "Напиши composable `useStorage(key, initial, storage)`: возвращает `ref`, синхронизированный с хранилищем.\n\n- При создании читает `storage.getItem(key)`. Есть значение — `JSON.parse`, нет — `initial`.\n- Битый JSON в хранилище не должен ронять код: тогда тоже `initial`.\n- Любое изменение значения, **в том числе внутри объекта или массива**, записывается: `storage.setItem(key, JSON.stringify(value))`.\n- `storage` передаётся аргументом. В тестах это подделка с `getItem` и `setItem`, в жизни — `localStorage`.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useStorage(key, initial, storage) {\n  \n}\n",
    "tests": [
      {
        "label": "читает сохранённое значение",
        "script": "(fn) => {\n  const s = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  s.data.theme = '\"dark\"'\n  return fn('theme', 'light', s).value\n}",
        "expected": "dark"
      },
      {
        "label": "нет значения — initial",
        "script": "(fn) => {\n  const s = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  return fn('theme', 'light', s).value\n}",
        "expected": "light"
      },
      {
        "label": "изменение записывается",
        "script": "async (fn, sleep, t) => {\n  const s = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  const r = fn('n', 1, s)\n  r.value = 5\n  await t.nextTick()\n  return s.data.n\n}",
        "expected": "5"
      },
      {
        "label": "push в массив тоже записывается",
        "script": "async (fn, sleep, t) => {\n  const s = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  const r = fn('list', [], s)\n  r.value.push('а')\n  await t.nextTick()\n  return s.data.list\n}",
        "expected": "[\"а\"]"
      },
      {
        "label": "битый JSON — initial",
        "script": "(fn) => {\n  const s = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null }, setItem(k, v) { this.data[k] = String(v) } }\n  s.data.x = '{oops'\n  return fn('x', 'по умолчанию', s).value\n}",
        "expected": "по умолчанию"
      }
    ],
    "solution": "function useStorage(key, initial, storage) {\n  function read() {\n    const raw = storage.getItem(key)\n    if (raw === null) return initial\n    try {\n      return JSON.parse(raw)\n    } catch {\n      return initial // битое значение не должно ронять страницу\n    }\n  }\n\n  const value = ref(read())\n  // deep: без него push в массив или правка поля объекта не запишутся —\n  // watch на ref следит только за заменой .value\n  watch(value, (next) => storage.setItem(key, JSON.stringify(next)), { deep: true })\n  return value\n}",
    "env": "vue"
  },
  {
    "id": "vue-debounced",
    "set": "d3",
    "fn": "useDebounced",
    "title": "Отложенный ref для поиска",
    "card": null,
    "statement": "Напиши composable `useDebounced(source, ms)`.\n\n- `source` — ref, например текст в поле поиска.\n- Вернуть новый ref. Сначала в нём то же значение, что в `source`.\n- Когда `source` меняется, новый ref получает значение через `ms` миллисекунд после **последнего** изменения. Новое изменение раньше срока сдвигает отсчёт.\n\nПрименение: `watch(useDebounced(query, 300), load)` — запрос уходит, когда человек перестал печатать.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useDebounced(source, ms) {\n  \n}\n",
    "tests": [
      {
        "label": "сначала — значение source",
        "script": "(fn, sleep, t) => fn(t.ref('а'), 50).value",
        "expected": "а"
      },
      {
        "label": "до паузы не меняется",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('а')\n  const d = fn(q, 60)\n  q.value = 'б'\n  await sleep(20)\n  return d.value\n}",
        "expected": "а"
      },
      {
        "label": "после паузы — последнее значение",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('а')\n  const d = fn(q, 50)\n  q.value = 'б'\n  await sleep(10)\n  q.value = 'в'\n  await sleep(100)\n  return d.value\n}",
        "expected": "в"
      },
      {
        "label": "каждое изменение сдвигает срок",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('а')\n  const d = fn(q, 60)\n  q.value = 'б'\n  await sleep(35)\n  q.value = 'в'\n  await sleep(35)\n  const early = d.value\n  await sleep(70)\n  return [early, d.value]\n}",
        "expected": [
          "а",
          "в"
        ]
      }
    ],
    "solution": "function useDebounced(source, ms) {\n  const debounced = ref(source.value)\n  let timer\n  watch(source, (value) => {\n    clearTimeout(timer)\n    timer = setTimeout(() => {\n      debounced.value = value\n    }, ms)\n  })\n  return debounced\n}\n// В компоненте таймер стоит снять в onUnmounted — или поставить через\n// onWatcherCleanup, тогда Vue сам отменит его при следующем срабатывании",
    "env": "vue"
  },
  {
    "id": "vue-pagination",
    "set": "d3",
    "fn": "usePagination",
    "title": "Composable пагинации",
    "card": null,
    "statement": "Напиши composable `usePagination(items, perPage)`.\n\n- `items` — ref массива, `perPage` — сколько элементов на странице.\n- Вернуть `{ page, pages, visible, next, prev }`:\n  - `page` — ref с номером текущей страницы, начинается с `1`;\n  - `pages` — computed, сколько всего страниц. Для пустого списка — `1`;\n  - `visible` — computed, элементы текущей страницы;\n  - `next()` и `prev()` листают, не выходя за границы.\n- Список укоротился и текущей страницы больше нет — `page` становится последней существующей.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function usePagination(items, perPage) {\n  \n}\n",
    "tests": [
      {
        "label": "первая страница",
        "script": "(fn, sleep, t) => {\n  const p = fn(t.ref([1, 2, 3, 4, 5, 6, 7]), 3)\n  return [p.page.value, p.pages.value, p.visible.value]\n}",
        "expected": [
          1,
          3,
          [
            1,
            2,
            3
          ]
        ]
      },
      {
        "label": "next и prev не выходят за границы",
        "script": "(fn, sleep, t) => {\n  const p = fn(t.ref([1, 2, 3, 4, 5, 6, 7]), 3)\n  p.next(); p.next(); p.next()\n  const last = [p.page.value, p.visible.value]\n  p.prev(); p.prev(); p.prev(); p.prev()\n  return [last, [p.page.value, p.visible.value]]\n}",
        "expected": [
          [
            3,
            [
              7
            ]
          ],
          [
            1,
            [
              1,
              2,
              3
            ]
          ]
        ]
      },
      {
        "label": "pages следит за списком",
        "script": "(fn, sleep, t) => {\n  const items = t.ref([1, 2, 3])\n  const p = fn(items, 3)\n  const before = p.pages.value\n  items.value.push(4)\n  return [before, p.pages.value]\n}",
        "expected": [
          1,
          2
        ]
      },
      {
        "label": "пустой список",
        "script": "(fn, sleep, t) => { const p = fn(t.ref([]), 5); return [p.pages.value, p.visible.value] }",
        "expected": [
          1,
          []
        ]
      },
      {
        "label": "список укоротился — страница сдвигается на последнюю",
        "script": "async (fn, sleep, t) => {\n  const items = t.ref([1, 2, 3, 4, 5, 6, 7, 8, 9])\n  const p = fn(items, 3)\n  p.next(); p.next()\n  items.value = [1, 2, 3, 4]\n  await t.nextTick()\n  return [p.page.value, p.visible.value]\n}",
        "expected": [
          2,
          [
            4
          ]
        ]
      }
    ],
    "solution": "function usePagination(items, perPage) {\n  const page = ref(1)\n  const pages = computed(() => Math.max(1, Math.ceil(items.value.length / perPage)))\n  const visible = computed(() => {\n    const start = (page.value - 1) * perPage\n    return items.value.slice(start, start + perPage)\n  })\n\n  function next() {\n    if (page.value < pages.value) page.value++\n  }\n  function prev() {\n    if (page.value > 1) page.value--\n  }\n\n  // Список укоротился — не оставляем человека на пустой странице\n  watch(pages, (total) => {\n    if (page.value > total) page.value = total\n  })\n\n  return { page, pages, visible, next, prev }\n}",
    "env": "vue"
  },
  {
    "id": "vue-review",
    "set": "d3",
    "fn": "useSelection",
    "title": "Код-ревью: найди пять ошибок",
    "card": null,
    "statement": "Это код на ревью: composable выбора товаров в списке. В нём **пять ошибок**. Найди их сначала глазами и проговори каждую — так выглядит задание «проведи ревью» на интервью. Потом исправь и запусти тесты.\n\nКак должно работать:\n\n- `items` — ref массива товаров `{ id, title }`;\n- `selected` — ref массива выбранных id; `count` — сколько выбрано; `allSelected` — выбраны ли все;\n- `toggle(id)` выбирает товар или снимает выбор, `selectAll()` выбирает все;\n- если `items` заменили новым массивом, из `selected` пропадают id, которых больше нет.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useSelection(items) {\n  const selected = ref([])\n\n  const count = computed(() => selected.length)\n  const allSelected = computed(() => count.value === items.length)\n\n  function toggle(id) {\n    const i = selected.value.indexOf(id)\n    if (i === -1) selected.value.push(id)\n    else selected.value.slice(i, 1)\n  }\n\n  function selectAll() {\n    selected = items.value.map((item) => item.id)\n  }\n\n  // Товары обновились — убираем из выбора то, чего больше нет\n  watch(items.value, (list) => {\n    selected.value = selected.value.filter((id) => list.some((item) => item.id === id))\n  })\n\n  return { selected, count, allSelected, toggle, selectAll }\n}\n",
    "tests": [
      {
        "label": "toggle выбирает, count считает",
        "script": "(fn, sleep, t) => {\n  const items = t.ref([{ id: 1, title: 'а' }, { id: 2, title: 'б' }, { id: 3, title: 'в' }])\n  const s = fn(items)\n  s.toggle(1)\n  s.toggle(2)\n  return [s.selected.value, s.count.value]\n}",
        "expected": [
          [
            1,
            2
          ],
          2
        ]
      },
      {
        "label": "повторный toggle снимает выбор",
        "script": "(fn, sleep, t) => {\n  const items = t.ref([{ id: 1, title: 'а' }, { id: 2, title: 'б' }, { id: 3, title: 'в' }])\n  const s = fn(items)\n  s.toggle(1)\n  s.toggle(2)\n  s.toggle(1)\n  return [s.selected.value, s.count.value]\n}",
        "expected": [
          [
            2
          ],
          1
        ]
      },
      {
        "label": "selectAll и allSelected",
        "script": "(fn, sleep, t) => {\n  const items = t.ref([{ id: 1, title: 'а' }, { id: 2, title: 'б' }, { id: 3, title: 'в' }])\n  const s = fn(items)\n  const before = s.allSelected.value\n  s.selectAll()\n  return [before, s.selected.value, s.allSelected.value]\n}",
        "expected": [
          false,
          [
            1,
            2,
            3
          ],
          true
        ]
      },
      {
        "label": "items заменили — лишние id ушли из выбора",
        "script": "async (fn, sleep, t) => {\n  const items = t.ref([{ id: 1, title: 'а' }, { id: 2, title: 'б' }, { id: 3, title: 'в' }])\n  const s = fn(items)\n  s.toggle(1)\n  s.toggle(3)\n  items.value = [{ id: 3, title: 'в' }, { id: 4, title: 'г' }]\n  await t.nextTick()\n  return [s.selected.value, s.allSelected.value]\n}",
        "expected": [
          [
            3
          ],
          false
        ]
      }
    ],
    "solution": "function useSelection(items) {\n  const selected = ref([])\n\n  // 1. было selected.length: у ref длины нет, массив лежит в .value\n  const count = computed(() => selected.value.length)\n  // 2. было items.length: items тоже ref\n  const allSelected = computed(() => count.value === items.value.length)\n\n  function toggle(id) {\n    const i = selected.value.indexOf(id)\n    if (i === -1) selected.value.push(id)\n    // 3. было slice: он возвращает копию и ничего не удаляет\n    else selected.value.splice(i, 1)\n  }\n\n  function selectAll() {\n    // 4. было selected = …: это попытка переприсвоить const, а не ref\n    selected.value = items.value.map((item) => item.id)\n  }\n\n  // 5. было watch(items.value, …): так watch следит за конкретным массивом,\n  // и замену items.value на новый массив не увидит\n  watch(items, (list) => {\n    selected.value = selected.value.filter((id) => list.some((item) => item.id === id))\n  })\n\n  return { selected, count, allSelected, toggle, selectAll }\n}",
    "env": "vue"
  },
  {
    "id": "p-vue-batch",
    "set": "d3p",
    "kind": "predict",
    "fn": "",
    "title": "Два присваивания и один watch",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const count = ref(0)\nwatch(count, (value) => console.log('watch', value))\ncount.value++\ncount.value++\nconsole.log('sync', count.value)\nawait nextTick()\nconsole.log('после nextTick')",
    "output": [
      "sync 2",
      "watch 2",
      "после nextTick"
    ],
    "starter": "",
    "tests": [],
    "solution": "    **Ответ: `sync 2`, `watch 2`, `после nextTick`.**\n\n    - Значение `ref` меняется сразу, поэтому синхронный `console.log` видит `2`.\n    - А `watch` не вызывается на каждое присваивание. Vue ставит его в очередь и выполняет пачкой перед следующим обновлением (`flush: 'pre'`) — к этому моменту значение уже `2`, и колбэк вызывается **один раз**.\n    - `await nextTick()` ждёт, пока очередь будет разобрана.\n\n    Нужен каждый шаг — `{ flush: 'sync' }`, но это редкость: пакетная обработка и делает Vue быстрым.\n\n\nКод выполняется с настоящим Vue 3, вне компонента.",
    "env": "vue"
  },
  {
    "id": "p-vue-computed",
    "set": "d3p",
    "kind": "predict",
    "fn": "",
    "title": "Когда пересчитывается computed",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const price = ref(100)\nconst qty = ref(2)\nconst total = computed(() => {\n  console.log('считаю')\n  return price.value * qty.value\n})\nconsole.log('до чтения')\nconsole.log(total.value)\nconsole.log(total.value)\nprice.value = 150\nprice.value = 300\nconsole.log(total.value)",
    "output": [
      "до чтения",
      "считаю",
      "200",
      "200",
      "считаю",
      "600"
    ],
    "starter": "",
    "tests": [],
    "solution": "    **Ответ: `до чтения`, `считаю`, `200`, `200`, `считаю`, `600`.**\n\n    - `computed` ленивый: пока его не прочитали, функция не выполняется.\n    - Результат кешируется: второе чтение без изменений зависимостей не пересчитывает.\n    - После изменения зависимости `computed` только помечается «устаревшим». Пересчёт — при следующем чтении и один раз, сколько бы присваиваний ни было.\n\n    Отсюда отличие от метода: метод в шаблоне выполняется на каждый рендер, `computed` — только когда изменились его зависимости.\n\n\nКод выполняется с настоящим Vue 3, вне компонента.",
    "env": "vue"
  },
  {
    "id": "p-vue-unwrap",
    "set": "d3p",
    "kind": "predict",
    "fn": "",
    "title": "Деструктуризация и разворачивание ref",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const state = reactive({ count: 1 })\nconst { count } = state\nconst countRef = toRef(state, 'count')\nstate.count = 10\nconsole.log(count, countRef.value)\nconst box = reactive({ inner: ref(5) })\nconsole.log(box.inner)\nconst list = reactive([ref(7)])\nconsole.log(isRef(list[0]))",
    "output": [
      "1 10",
      "5",
      "true"
    ],
    "starter": "",
    "tests": [],
    "solution": "    **Ответ: `1 10`, `5`, `true`.**\n\n    - Деструктуризация `reactive` копирует **текущее значение** в обычную переменную — связь с состоянием теряется. `toRef` и `toRefs` делают ref, привязанный к свойству. То же с пропсами: `const { title } = props` теряет реактивность (кроме деструктуризации прямо в `defineProps` с Vue 3.5).\n    - `reactive` разворачивает ref в свойствах объекта: `box.inner` — это `5`, без `.value`.\n    - В массивах и `Map` ref **не** разворачивается: `list[0]` — сам ref, нужен `list[0].value`.\n\n\nКод выполняется с настоящим Vue 3, вне компонента.",
    "env": "vue"
  },
  {
    "id": "p-vue-effect-order",
    "set": "d3p",
    "kind": "predict",
    "fn": "",
    "title": "watchEffect и watch на одном ref",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const query = ref('а')\nwatchEffect(() => console.log('effect', query.value))\nwatch(query, (next, prev) => console.log('watch', prev, '→', next))\nquery.value = 'б'\nconsole.log('sync')\nawait nextTick()",
    "output": [
      "effect а",
      "sync",
      "effect б",
      "watch а → б"
    ],
    "starter": "",
    "tests": [],
    "solution": "    **Ответ: `effect а`, `sync`, `effect б`, `watch а → б`.**\n\n    - `watchEffect` выполняется **сразу** при создании: так он узнаёт, какие свойства читает.\n    - `watch` при создании не вызывается (если нет `immediate: true`), зато получает новое и старое значение.\n    - На изменение оба реагируют не синхронно, а в очереди перед обновлением — поэтому `sync` раньше. Порядок в очереди — порядок создания.\n\n\nКод выполняется с настоящим Vue 3, вне компонента.",
    "env": "vue"
  },
  {
    "id": "p-vue-shallow-watch",
    "set": "d3p",
    "kind": "predict",
    "fn": "",
    "title": "watch на ref с массивом",
    "card": null,
    "statement": "Что выведет этот код? Запиши вывод в поле: по строке на каждый `console.log`, можно и через пробел. Сначала рассуждай вслух, потом проверяй.",
    "code": "const list = ref([1, 2])\nwatch(list, () => console.log('сработал watch'))\nlist.value.push(3)\nawait nextTick()\nconsole.log('после push')\nlist.value = [...list.value, 4]\nawait nextTick()\nconsole.log('после замены')",
    "output": [
      "после push",
      "сработал watch",
      "после замены"
    ],
    "starter": "",
    "tests": [],
    "solution": "    **Ответ: `после push`, `сработал watch`, `после замены`.**\n\n    - `watch(ref)` следит только за `.value`, то есть за **заменой** массива. `push` меняет массив внутри, ссылка та же — колбэк не вызывается.\n    - Замена `list.value = [...]` — новая ссылка, `watch` срабатывает.\n    - Следить за изменениями внутри: `watch(list, cb, { deep: true })` или геттер `watch(() => list.value.length, cb)`.\n    - А вот `watch(reactiveObject, cb)` сразу глубокий — частая путаница на интервью.\n\n\nКод выполняется с настоящим Vue 3, вне компонента.",
    "env": "vue"
  },
  {
    "id": "pinia-favorites",
    "set": "d4",
    "fn": "useFavoritesStore",
    "title": "Pinia: избранное на setup-сторе",
    "card": null,
    "statement": "Объяви стор избранного **в setup-синтаксисе**: `const useFavoritesStore = defineStore('favorites', () => { … })`.\n\n- `ids` — массив id товаров в избранном;\n- `count` — сколько товаров в избранном;\n- `isFavorite(id)` — есть ли товар в избранном;\n- `toggle(id)` — добавить, если нет, иначе убрать;\n- `clear()` — очистить.\n\nВспомни, что из setup-функции нужно вернуть, чтобы оно попало в стор.\n\n\n`defineStore`, `storeToRefs`, `ref`, `computed` и подставные функции Nuxt (`$fetch`, `useRoute`, `useAsyncData`) доступны без импорта.",
    "starter": "const useFavoritesStore = defineStore('favorites', () => {\n  \n})\n",
    "tests": [
      {
        "label": "toggle добавляет и убирает",
        "script": "(fn) => {\n  const s = fn()\n  s.toggle(5)\n  s.toggle(7)\n  s.toggle(5)\n  return s.ids\n}",
        "expected": [
          7
        ]
      },
      {
        "label": "isFavorite и count",
        "script": "(fn) => {\n  const s = fn()\n  s.toggle(1)\n  s.toggle(2)\n  return [s.isFavorite(1), s.isFavorite(3), s.count]\n}",
        "expected": [
          true,
          false,
          2
        ]
      },
      {
        "label": "count реактивен через storeToRefs",
        "script": "(fn, sleep, t) => {\n  const s = fn()\n  const { count } = t.storeToRefs(s)\n  s.toggle(1)\n  return count.value\n}",
        "expected": 1
      },
      {
        "label": "один стор на всё приложение",
        "script": "(fn) => {\n  fn().toggle(9)\n  return fn().ids\n}",
        "expected": [
          9
        ]
      },
      {
        "label": "clear",
        "script": "(fn) => {\n  const s = fn()\n  s.toggle(1)\n  s.clear()\n  return [s.ids, s.count]\n}",
        "expected": [
          [],
          0
        ]
      }
    ],
    "solution": "const useFavoritesStore = defineStore('favorites', () => {\n  const ids = ref([]) // ref → state\n\n  const count = computed(() => ids.value.length) // computed → getter\n  const isFavorite = (id) => ids.value.includes(id)\n\n  // функции → actions\n  function toggle(id) {\n    const i = ids.value.indexOf(id)\n    if (i === -1) ids.value.push(id)\n    else ids.value.splice(i, 1)\n  }\n\n  function clear() {\n    ids.value = []\n  }\n\n  // В стор попадает только то, что вернули\n  return { ids, count, isFavorite, toggle, clear }\n})",
    "env": "vue"
  },
  {
    "id": "pinia-catalog",
    "set": "d4",
    "fn": "useCatalogStore",
    "title": "Pinia: каталог с подгрузкой",
    "card": null,
    "statement": "Объяви стор `useCatalogStore = defineStore('catalog', …)` для каталога с кнопкой «Показать ещё».\n\nСостояние: `items` (массив), `page` (номер последней загруженной страницы, сначала `0`), `loading`, `error` (`null` или текст), `hasMore` (сначала `true`).\n\nДействие `async loadMore()`:\n\n- если загрузка уже идёт или `hasMore === false` — ничего не делает;\n- иначе загружает `$fetch('/api/products', { query: { page: page + 1 } })`. Ответ — `{ items, hasMore }`;\n- новые товары **дописываются** в конец, `page` увеличивается на 1;\n- при ошибке: `error` — текст ошибки (`e.message`), `items` и `page` не меняются;\n- перед загрузкой `error` очищается, после — `loading` сбрасывается в любом случае.\n\n\n`defineStore`, `storeToRefs`, `ref`, `computed` и подставные функции Nuxt (`$fetch`, `useRoute`, `useAsyncData`) доступны без импорта.",
    "starter": "const useCatalogStore = defineStore('catalog', () => {\n  \n})\n",
    "tests": [
      {
        "label": "первая загрузка",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async (url, o) => ({ items: [o.query.page * 10 + 1, o.query.page * 10 + 2], hasMore: true })\n  const s = fn()\n  await s.loadMore()\n  const call = t.nuxt.calls.$fetch[0]\n  return [s.items, s.page, call.url, call.options.query]\n}",
        "expected": [
          [
            11,
            12
          ],
          1,
          "/api/products",
          {
            "page": 1
          }
        ]
      },
      {
        "label": "вторая страница дописывается",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async (url, o) => ({ items: [o.query.page * 10 + 1, o.query.page * 10 + 2], hasMore: true })\n  const s = fn()\n  await s.loadMore()\n  await s.loadMore()\n  return [s.items, s.page]\n}",
        "expected": [
          [
            11,
            12,
            21,
            22
          ],
          2
        ]
      },
      {
        "label": "двойной вызов во время загрузки — один запрос",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { await sleep(40); return { items: [1], hasMore: true } }\n  const s = fn()\n  const p1 = s.loadMore()\n  const p2 = s.loadMore()\n  const during = s.loading\n  await Promise.all([p1, p2])\n  return [during, t.nuxt.calls.$fetch.length, s.loading]\n}",
        "expected": [
          true,
          1,
          false
        ]
      },
      {
        "label": "hasMore: false — больше не грузит",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => ({ items: [1], hasMore: false })\n  const s = fn()\n  await s.loadMore()\n  await s.loadMore()\n  return [t.nuxt.calls.$fetch.length, s.hasMore]\n}",
        "expected": [
          1,
          false
        ]
      },
      {
        "label": "ошибка не портит состояние, повтор её очищает",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { throw new Error('Сервер недоступен') }\n  const s = fn()\n  await s.loadMore()\n  const failed = [s.error, [...s.items], s.page, s.loading]\n  t.nuxt.fetchImpl = async (url, o) => ({ items: [o.query.page * 10 + 1, o.query.page * 10 + 2], hasMore: true })\n  await s.loadMore()\n  return [failed, s.error, s.items]\n}",
        "expected": [
          [
            "Сервер недоступен",
            [],
            0,
            false
          ],
          null,
          [
            11,
            12
          ]
        ]
      }
    ],
    "solution": "const useCatalogStore = defineStore('catalog', () => {\n  const items = ref([])\n  const page = ref(0)\n  const loading = ref(false)\n  const error = ref(null)\n  const hasMore = ref(true)\n\n  async function loadMore() {\n    // Защита от двойного клика и от «прокрутили до конца, а грузить нечего»\n    if (loading.value || !hasMore.value) return\n    loading.value = true\n    error.value = null\n    try {\n      const res = await $fetch('/api/products', { query: { page: page.value + 1 } })\n      items.value.push(...res.items)\n      page.value += 1\n      hasMore.value = res.hasMore\n    } catch (e) {\n      error.value = e.message\n    } finally {\n      loading.value = false\n    }\n  }\n\n  return { items, page, loading, error, hasMore, loadMore }\n})",
    "env": "vue"
  },
  {
    "id": "nuxt-catalog-page",
    "set": "d4",
    "fn": "useCatalogPage",
    "title": "Nuxt: страница категории с ?page=",
    "card": null,
    "statement": "Страница `pages/catalog/[category].vue`, адрес вида `/catalog/phones?page=2`. Напиши её загрузку данных: `async function useCatalogPage()`.\n\n- Категория — `useRoute().params.category`.\n- Страница — `useRoute().query.page`. Это строка: преврати в целое число. Нет параметра, не число или меньше 1 — значит `1`.\n- Данные — через `useAsyncData` с **ключом** `catalog-<категория>-<страница>` и загрузкой `$fetch('/api/catalog/<категория>', { query: { page } })`.\n- Вернуть `{ page, data }`, где `page` — число, а `data` — из `useAsyncData`.\n\nПодумай, почему ключ должен содержать и категорию, и страницу.\n\n\n`defineStore`, `storeToRefs`, `ref`, `computed` и подставные функции Nuxt (`$fetch`, `useRoute`, `useAsyncData`) доступны без импорта.",
    "starter": "async function useCatalogPage() {\n  \n}\n",
    "tests": [
      {
        "label": "ключ и запрос для /catalog/phones?page=2",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.category = 'phones'\n  t.nuxt.route.query.page = '2'\n  t.nuxt.fetchImpl = async () => ['телефон']\n  const r = await fn()\n  return [r.page, t.nuxt.calls.useAsyncData[0].key, t.nuxt.calls.$fetch[0]]\n}",
        "expected": [
          2,
          "catalog-phones-2",
          {
            "url": "/api/catalog/phones",
            "options": {
              "query": {
                "page": 2
              }
            }
          }
        ]
      },
      {
        "label": "без ?page — первая страница",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.category = 'phones'\n  const r = await fn()\n  return [r.page, t.nuxt.calls.useAsyncData[0].key]\n}",
        "expected": [
          1,
          "catalog-phones-1"
        ]
      },
      {
        "label": "мусор в ?page — первая страница",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.category = 'tv'\n  const pages = []\n  for (const raw of ['abc', '0', '-3']) {\n    t.nuxt.route.query.page = raw\n    pages.push((await fn()).page)\n  }\n  return pages\n}",
        "expected": [
          1,
          1,
          1
        ]
      },
      {
        "label": "data — ответ сервера",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.category = 'phones'\n  t.nuxt.fetchImpl = async () => ['телефон']\n  const r = await fn()\n  await sleep(10)\n  return t.unref(r.data)\n}",
        "expected": [
          "телефон"
        ]
      }
    ],
    "solution": "async function useCatalogPage() {\n  const route = useRoute()\n  const category = route.params.category\n\n  // query приходит строкой — а может и не прийти\n  const parsed = Number.parseInt(route.query.page, 10)\n  const page = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1\n\n  // Ключ включает всё, от чего зависят данные: с одинаковым ключом\n  // вторая страница получила бы закешированный ответ первой\n  const { data } = await useAsyncData(`catalog-${category}-${page}`, () =>\n    $fetch(`/api/catalog/${category}`, { query: { page } }),\n  )\n\n  return { page, data }\n}\n// В настоящем Nuxt при смене ?page на той же странице компонент не\n// пересоздаётся. Тогда ключ делают геттером или передают\n// watch: [() => route.query.page] в опциях useAsyncData",
    "env": "vue"
  },
  {
    "id": "route-match",
    "set": "d4",
    "fn": "matchRoute",
    "title": "Сопоставить адрес с маршрутом",
    "card": null,
    "statement": "Так роутер Nuxt понимает, что `/product/42` — это файл `pages/product/[id].vue`. Напиши `matchRoute(pattern, path)`.\n\n- `pattern` — шаблон вроде `/product/:id` или `/catalog/:category/:id`. Сегмент с двоеточием — параметр.\n- Вернуть объект параметров (`{ id: '42' }`), если адрес подходит, иначе `null`.\n- Обычные сегменты должны совпадать точно, число сегментов — тоже. Параметр не может быть пустым.\n- Завершающий `/` не мешает: `/product/42/` подходит.\n- Query-строку (`?…`) игнорировать.",
    "starter": "function matchRoute(pattern, path) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "/product/:id",
          "/product/42"
        ],
        "expected": {
          "id": "42"
        }
      },
      {
        "args": [
          "/catalog/:category/:id",
          "/catalog/phones/7"
        ],
        "expected": {
          "category": "phones",
          "id": "7"
        }
      },
      {
        "args": [
          "/product/:id",
          "/products/42"
        ],
        "expected": null
      },
      {
        "args": [
          "/product/:id",
          "/product/42/reviews"
        ],
        "expected": null
      },
      {
        "args": [
          "/product/:id",
          "/product/42/"
        ],
        "expected": {
          "id": "42"
        }
      },
      {
        "args": [
          "/about",
          "/about"
        ],
        "expected": {}
      },
      {
        "args": [
          "/product/:id",
          "/product/42?tab=reviews"
        ],
        "expected": {
          "id": "42"
        }
      },
      {
        "args": [
          "/user/:id",
          "/user/"
        ],
        "expected": null
      }
    ],
    "solution": "function matchRoute(pattern, path) {\n  const clean = path.split('?')[0]\n  // filter(Boolean) убирает пустые куски от ведущего и хвостового '/'\n  const split = (s) => s.split('/').filter(Boolean)\n  const want = split(pattern)\n  const got = split(clean)\n  if (want.length !== got.length) return null\n\n  const params = {}\n  for (let i = 0; i < want.length; i++) {\n    if (want[i].startsWith(':')) params[want[i].slice(1)] = got[i]\n    else if (want[i] !== got[i]) return null\n  }\n  return params\n}"
  },
  {
    "id": "fetch-timeout",
    "set": "d5",
    "fn": "fetchWithTimeout",
    "title": "fetch с таймаутом и отменой",
    "card": null,
    "statement": "Напиши `fetchWithTimeout(url, ms, fetchFn = fetch)`.\n\n- Вызывает `fetchFn(url, { signal })`, где `signal` — от `AbortController`.\n- Ответ пришёл раньше `ms` — возвращает его.\n- Не пришёл — **отменяет запрос** через `controller.abort()` и отклоняет промис ошибкой `new Error('Таймаут')`.\n- Другие ошибки `fetchFn` пробрасываются как есть.\n- Когда ответ пришёл, таймер нужно снять: иначе он сработает позже и отменит уже ненужное.\n\nВ тестах вместо `fetch` — подделка, которая уважает `signal`, как настоящий `fetch`.",
    "starter": "async function fetchWithTimeout(url, ms, fetchFn = fetch) {\n  \n}\n",
    "tests": [
      {
        "label": "быстрый ответ возвращается",
        "script": "async (fn, sleep) => {\n  const fake = (delay, onSignal) => (url, opts) => {\n    if (onSignal) onSignal(opts.signal)\n    return new Promise((resolve, reject) => {\n      const timer = setTimeout(() => resolve('ответ ' + url), delay)\n      opts.signal.addEventListener('abort', () => {\n        clearTimeout(timer)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  return fn('/a', 100, fake(10))\n}",
        "expected": "ответ /a"
      },
      {
        "label": "медленный — ошибка «Таймаут»",
        "script": "async (fn, sleep) => {\n  const fake = (delay, onSignal) => (url, opts) => {\n    if (onSignal) onSignal(opts.signal)\n    return new Promise((resolve, reject) => {\n      const timer = setTimeout(() => resolve('ответ ' + url), delay)\n      opts.signal.addEventListener('abort', () => {\n        clearTimeout(timer)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  try {\n    await fn('/a', 30, fake(200))\n    return 'ответ пришёл'\n  } catch (e) {\n    return e.message\n  }\n}",
        "expected": "Таймаут"
      },
      {
        "label": "по таймауту запрос отменён через signal",
        "script": "async (fn, sleep) => {\n  const fake = (delay, onSignal) => (url, opts) => {\n    if (onSignal) onSignal(opts.signal)\n    return new Promise((resolve, reject) => {\n      const timer = setTimeout(() => resolve('ответ ' + url), delay)\n      opts.signal.addEventListener('abort', () => {\n        clearTimeout(timer)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  let signal\n  try {\n    await fn('/a', 30, fake(200, (s) => { signal = s }))\n  } catch (e) {}\n  return signal ? signal.aborted : 'signal не передан'\n}",
        "expected": true
      },
      {
        "label": "чужие ошибки пробрасываются",
        "script": "async (fn) => {\n  try {\n    await fn('/a', 100, async () => { throw new Error('Нет сети') })\n    return 'ошибки нет'\n  } catch (e) {\n    return e.message\n  }\n}",
        "expected": "Нет сети"
      },
      {
        "label": "после ответа таймер снят — отмены не будет",
        "script": "async (fn, sleep) => {\n  const fake = (delay, onSignal) => (url, opts) => {\n    if (onSignal) onSignal(opts.signal)\n    return new Promise((resolve, reject) => {\n      const timer = setTimeout(() => resolve('ответ ' + url), delay)\n      opts.signal.addEventListener('abort', () => {\n        clearTimeout(timer)\n        const e = new Error('aborted')\n        e.name = 'AbortError'\n        reject(e)\n      })\n    })\n  }\n  let signal\n  await fn('/a', 40, fake(5, (s) => { signal = s }))\n  await sleep(80)\n  return signal.aborted\n}",
        "expected": false
      }
    ],
    "solution": "async function fetchWithTimeout(url, ms, fetchFn = fetch) {\n  const controller = new AbortController()\n  let timedOut = false\n  const timer = setTimeout(() => {\n    timedOut = true\n    controller.abort() // браузер действительно обрывает запрос, а не просто перестаёт ждать\n  }, ms)\n\n  try {\n    return await fetchFn(url, { signal: controller.signal })\n  } catch (err) {\n    // Отмену из-за таймера показываем понятной ошибкой, остальные — как есть\n    if (timedOut) throw new Error('Таймаут')\n    throw err\n  } finally {\n    clearTimeout(timer)\n  }\n}\n// В новых браузерах то же самое делает AbortSignal.timeout(ms)"
  },
  {
    "id": "lru-cache",
    "set": "d5",
    "fn": "LRUCache",
    "title": "LRU-кеш",
    "card": null,
    "statement": "Напиши класс `LRUCache` — кеш ограниченного размера, который выкидывает то, чем дольше всего не пользовались.\n\n- `new LRUCache(capacity)` — сколько ключей помещается.\n- `get(key)` — значение или `undefined`. Чтение делает ключ «свежим».\n- `set(key, value)` — записывает; перезапись тоже делает ключ свежим. Если ключей стало больше `capacity`, удаляется **самый давно использованный**.\n- Обе операции — O(1).\n\nПодсказка: `Map` помнит порядок вставки.",
    "starter": "class LRUCache {\n  constructor(capacity) {\n    \n  }\n}\n",
    "tests": [
      {
        "label": "get и отсутствующий ключ",
        "script": "(C) => {\n  const c = new C(2)\n  c.set('a', 1)\n  c.set('b', 2)\n  return [c.get('a'), c.get('x') === undefined]\n}",
        "expected": [
          1,
          true
        ]
      },
      {
        "label": "переполнение выкидывает самый старый",
        "script": "(C) => {\n  const c = new C(2)\n  c.set('a', 1)\n  c.set('b', 2)\n  c.set('c', 3)\n  return [c.get('a') === undefined, c.get('b'), c.get('c')]\n}",
        "expected": [
          true,
          2,
          3
        ]
      },
      {
        "label": "get освежает ключ",
        "script": "(C) => {\n  const c = new C(2)\n  c.set('a', 1)\n  c.set('b', 2)\n  c.get('a')\n  c.set('c', 3)\n  return [c.get('b') === undefined, c.get('a'), c.get('c')]\n}",
        "expected": [
          true,
          1,
          3
        ]
      },
      {
        "label": "перезапись освежает и обновляет",
        "script": "(C) => {\n  const c = new C(2)\n  c.set('a', 1)\n  c.set('b', 2)\n  c.set('a', 10)\n  c.set('c', 3)\n  return [c.get('b') === undefined, c.get('a'), c.get('c')]\n}",
        "expected": [
          true,
          10,
          3
        ]
      },
      {
        "label": "capacity = 1",
        "script": "(C) => {\n  const c = new C(1)\n  c.set('a', 1)\n  c.set('b', 2)\n  return [c.get('a') === undefined, c.get('b')]\n}",
        "expected": [
          true,
          2
        ]
      }
    ],
    "solution": "class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity\n    this.map = new Map() // порядок ключей: от давно использованного к свежему\n  }\n\n  get(key) {\n    if (!this.map.has(key)) return undefined\n    const value = this.map.get(key)\n    // Переставляем в конец: удалить и вставить заново\n    this.map.delete(key)\n    this.map.set(key, value)\n    return value\n  }\n\n  set(key, value) {\n    this.map.delete(key)\n    this.map.set(key, value)\n    if (this.map.size > this.capacity) {\n      // Первый ключ в Map — самый давно использованный\n      this.map.delete(this.map.keys().next().value)\n    }\n  }\n}"
  },
  {
    "id": "parse-query",
    "set": "d5",
    "fn": "parseQuery",
    "title": "Разобрать query-строку",
    "card": null,
    "statement": "Напиши `parseQuery(search)` — разбор строки вроде `?page=2&tag=vue&tag=nuxt` в объект. Без `URLSearchParams`: на интервью его часто просят не использовать.\n\n- Знак `?` в начале может быть, а может не быть.\n- Повторяющийся ключ → массив значений в порядке появления.\n- Ключи и значения декодируются: `%D1%87` → буква, `+` → пробел.\n- Ключ без значения (`?debug`) → `''`.\n- Делить пару по **первому** `=`: в значении он тоже может встретиться.\n- Пустая строка или `?` → `{}`.",
    "starter": "function parseQuery(search) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "?page=2&sort=price"
        ],
        "expected": {
          "page": "2",
          "sort": "price"
        }
      },
      {
        "args": [
          "page=2"
        ],
        "expected": {
          "page": "2"
        }
      },
      {
        "args": [
          "?tag=vue&tag=nuxt&tag=pinia"
        ],
        "expected": {
          "tag": [
            "vue",
            "nuxt",
            "pinia"
          ]
        }
      },
      {
        "args": [
          "?q=%D1%87%D0%B0%D0%B9+%D0%B7%D0%B5%D0%BB%D1%91%D0%BD%D1%8B%D0%B9"
        ],
        "expected": {
          "q": "чай зелёный"
        }
      },
      {
        "args": [
          "?debug&page=1"
        ],
        "expected": {
          "debug": "",
          "page": "1"
        }
      },
      {
        "args": [
          ""
        ],
        "expected": {}
      },
      {
        "args": [
          "?"
        ],
        "expected": {}
      },
      {
        "args": [
          "?a=1=2"
        ],
        "expected": {
          "a": "1=2"
        }
      },
      {
        "label": "без URLSearchParams",
        "script": "(fn) => {\n  const original = globalThis.URLSearchParams\n  globalThis.URLSearchParams = function () { throw new Error('URLSearchParams использовать нельзя') }\n  try {\n    return fn('?x=1')\n  } finally {\n    globalThis.URLSearchParams = original\n  }\n}",
        "expected": {
          "x": "1"
        }
      }
    ],
    "solution": "function parseQuery(search) {\n  const result = {}\n  const text = search.startsWith('?') ? search.slice(1) : search\n  if (!text) return result\n\n  const decode = (s) => decodeURIComponent(s.replace(/\\+/g, ' '))\n  for (const pair of text.split('&')) {\n    if (!pair) continue\n    const eq = pair.indexOf('=')\n    const key = decode(eq === -1 ? pair : pair.slice(0, eq))\n    const value = eq === -1 ? '' : decode(pair.slice(eq + 1))\n\n    // hasOwn, а не in: у пустого объекта «есть» toString и constructor\n    if (!Object.hasOwn(result, key)) result[key] = value\n    else if (Array.isArray(result[key])) result[key].push(value)\n    else result[key] = [result[key], value]\n  }\n  return result\n}"
  },
  {
    "id": "flatten-object",
    "set": "mock",
    "fn": "flattenObject",
    "title": "Развернуть вложенный объект",
    "card": null,
    "statement": "Напиши `flattenObject(obj)`: вложенные объекты превращаются в ключи через точку.\n\n```js\nflattenObject({ a: { b: 1, c: { d: 2 } }, e: 3 })\n// { 'a.b': 1, 'a.c.d': 2, e: 3 }\n```\n\n- Массивы, `null` и примитивы — значения как есть, массив не разворачивается.\n- Пустой вложенный объект остаётся значением: `{ a: {} }` → `{ a: {} }`.",
    "starter": "function flattenObject(obj) {\n  \n}\n",
    "tests": [
      {
        "args": [
          {
            "a": {
              "b": 1,
              "c": {
                "d": 2
              }
            },
            "e": 3
          }
        ],
        "expected": {
          "a.b": 1,
          "a.c.d": 2,
          "e": 3
        }
      },
      {
        "args": [
          {
            "a": [
              1,
              {
                "b": 2
              }
            ],
            "n": null
          }
        ],
        "expected": {
          "a": [
            1,
            {
              "b": 2
            }
          ],
          "n": null
        }
      },
      {
        "args": [
          {}
        ],
        "expected": {}
      },
      {
        "args": [
          {
            "a": {}
          }
        ],
        "expected": {
          "a": {}
        }
      },
      {
        "args": [
          {
            "x": {
              "y": {
                "z": {
                  "w": "глубоко"
                }
              }
            }
          }
        ],
        "expected": {
          "x.y.z.w": "глубоко"
        }
      }
    ],
    "solution": "function flattenObject(obj, prefix = '', out = {}) {\n  for (const [key, value] of Object.entries(obj)) {\n    const path = prefix ? prefix + '.' + key : key\n    const isPlainObject = typeof value === 'object' && value !== null && !Array.isArray(value)\n    if (isPlainObject && Object.keys(value).length > 0) flattenObject(value, path, out)\n    else out[path] = value\n  }\n  return out\n}"
  },
  {
    "id": "top-k",
    "set": "mock",
    "fn": "topKFrequent",
    "title": "k самых частых слов",
    "card": null,
    "statement": "Напиши `topKFrequent(words, k)`: `k` самых частых слов.\n\n- По убыванию частоты, при равной частоте — по алфавиту (обычное сравнение строк).\n- Слов меньше `k` — вернуть сколько есть.\n\nПример: `(['vue', 'react', 'vue', 'nuxt', 'react', 'vue'], 2)` → `['vue', 'react']`.\n\nНазови сложность своего решения.",
    "starter": "function topKFrequent(words, k) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            "vue",
            "react",
            "vue",
            "nuxt",
            "react",
            "vue"
          ],
          2
        ],
        "expected": [
          "vue",
          "react"
        ]
      },
      {
        "args": [
          [
            "b",
            "a",
            "c",
            "a",
            "b",
            "c"
          ],
          2
        ],
        "expected": [
          "a",
          "b"
        ]
      },
      {
        "args": [
          [
            "x"
          ],
          3
        ],
        "expected": [
          "x"
        ]
      },
      {
        "args": [
          [],
          1
        ],
        "expected": []
      },
      {
        "args": [
          [
            "яблоко",
            "груша",
            "яблоко",
            "банан",
            "груша",
            "яблоко",
            "банан"
          ],
          3
        ],
        "expected": [
          "яблоко",
          "банан",
          "груша"
        ]
      }
    ],
    "solution": "function topKFrequent(words, k) {\n  const counts = new Map()\n  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)\n\n  return [...counts.keys()]\n    // Сначала по частоте; при равенстве разность 0 — и решает алфавит\n    .sort((a, b) => counts.get(b) - counts.get(a) || (a < b ? -1 : a > b ? 1 : 0))\n    .slice(0, k)\n}\n// O(n + m log m): n — слов всего, m — разных слов"
  },
  {
    "id": "vue-product-filter",
    "set": "mock",
    "fn": "useProductFilter",
    "title": "Vue: фильтры каталога",
    "card": null,
    "statement": "Напиши composable `useProductFilter(products)` для списка товаров с фильтрами.\n\n- `products` — ref массива `{ id, title, price, inStock }`.\n- `filters` — `reactive({ query: '', maxPrice: null, onlyInStock: false })`.\n- `sort` — ref: `'price-asc'`, `'price-desc'` или `''` (без сортировки).\n- `result` — computed: товары, у которых `title` содержит `query` без учёта регистра и пробелов по краям, цена не больше `maxPrice` (если задан), есть в наличии (если `onlyInStock`). Отсортированы по `sort`. **Исходный массив не меняется.**\n- `reset()` — возвращает фильтры и сортировку к начальным значениям.\n\n\n`ref`, `reactive`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useProductFilter(products) {\n  \n}\n",
    "tests": [
      {
        "label": "без фильтров — все товары",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  return fn(products).result.value.map((p) => p.id)\n}",
        "expected": [
          1,
          2,
          3,
          4
        ]
      },
      {
        "label": "поиск без регистра и пробелов по краям",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  const f = fn(products)\n  f.filters.query = '  ЧА '\n  return f.result.value.map((p) => p.id)\n}",
        "expected": [
          1,
          2,
          4
        ]
      },
      {
        "label": "цена и наличие",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  const f = fn(products)\n  f.filters.maxPrice = 2000\n  f.filters.onlyInStock = true\n  return f.result.value.map((p) => p.id)\n}",
        "expected": [
          1,
          4
        ]
      },
      {
        "label": "сортировка не трогает исходный массив",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  const f = fn(products)\n  f.sort.value = 'price-asc'\n  const asc = f.result.value.map((p) => p.id)\n  f.sort.value = 'price-desc'\n  const desc = f.result.value.map((p) => p.id)\n  return [asc, desc, products.value.map((p) => p.id)]\n}",
        "expected": [
          [
            4,
            2,
            1,
            3
          ],
          [
            3,
            1,
            2,
            4
          ],
          [
            1,
            2,
            3,
            4
          ]
        ]
      },
      {
        "label": "новый товар в списке попадает в результат",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  const f = fn(products)\n  f.filters.query = 'чай'\n  products.value.push({ id: 5, title: 'Чайный набор', price: 900, inStock: true })\n  return f.result.value.map((p) => p.id)\n}",
        "expected": [
          1,
          4,
          5
        ]
      },
      {
        "label": "reset",
        "script": "(fn, sleep, t) => {\n  const products = t.ref([\n    { id: 1, title: 'Чайник', price: 2000, inStock: true },\n    { id: 2, title: 'Чашка', price: 300, inStock: false },\n    { id: 3, title: 'Кофемолка', price: 3500, inStock: true },\n    { id: 4, title: 'Чай чёрный', price: 250, inStock: true },\n  ])\n  const f = fn(products)\n  f.filters.query = 'чай'\n  f.filters.onlyInStock = true\n  f.sort.value = 'price-desc'\n  f.reset()\n  return [f.result.value.map((p) => p.id), f.filters.query, f.filters.onlyInStock, f.sort.value]\n}",
        "expected": [
          [
            1,
            2,
            3,
            4
          ],
          "",
          false,
          ""
        ]
      }
    ],
    "solution": "function useProductFilter(products) {\n  const initial = () => ({ query: '', maxPrice: null, onlyInStock: false })\n  const filters = reactive(initial())\n  const sort = ref('')\n\n  const result = computed(() => {\n    const q = filters.query.trim().toLowerCase()\n    const list = products.value.filter(\n      (p) =>\n        p.title.toLowerCase().includes(q) &&\n        (filters.maxPrice == null || p.price <= filters.maxPrice) &&\n        (!filters.onlyInStock || p.inStock),\n    )\n    // filter уже вернул новый массив, поэтому sort не тронет исходный\n    if (sort.value === 'price-asc') list.sort((a, b) => a.price - b.price)\n    if (sort.value === 'price-desc') list.sort((a, b) => b.price - a.price)\n    return list\n  })\n\n  function reset() {\n    Object.assign(filters, initial())\n    sort.value = ''\n  }\n\n  return { filters, sort, result, reset }\n}",
    "env": "vue"
  },
  {
    "id": "memoize",
    "set": "week",
    "fn": "memoize",
    "title": "memoize",
    "card": null,
    "statement": "Напиши `memoize(fn)`: обёртка, которая запоминает результат для каждого набора аргументов.\n\n- Повторный вызов с теми же аргументами не вызывает `fn`, а возвращает запомненное.\n- Аргументы сравниваются по значению: ключ можно собрать через `JSON.stringify(args)`.\n- Запоминается и `undefined`, если `fn` честно его вернула.",
    "starter": "function memoize(fn) {\n  \n}\n",
    "tests": [
      {
        "label": "повтор не вызывает fn",
        "script": "(fn) => {\n  let calls = 0\n  const m = fn((a, b) => { calls++; return a + b })\n  return [m(1, 2), m(1, 2), m(2, 1), calls]\n}",
        "expected": [
          3,
          3,
          3,
          2
        ]
      },
      {
        "label": "'1' и 1 — разные аргументы",
        "script": "(fn) => {\n  let calls = 0\n  const m = fn((a) => { calls++; return typeof a })\n  return [m('1'), m(1), calls]\n}",
        "expected": [
          "string",
          "number",
          2
        ]
      },
      {
        "label": "undefined тоже запоминается",
        "script": "(fn) => {\n  let calls = 0\n  const m = fn(() => { calls++ })\n  m(); m(); m()\n  return calls\n}",
        "expected": 1
      }
    ],
    "solution": "function memoize(fn) {\n  const cache = new Map()\n  return function (...args) {\n    const key = JSON.stringify(args)\n    // has, а не get: функция может честно вернуть undefined\n    if (!cache.has(key)) cache.set(key, fn.apply(this, args))\n    return cache.get(key)\n  }\n}"
  },
  {
    "id": "once",
    "set": "week",
    "fn": "once",
    "title": "once",
    "card": null,
    "statement": "Напиши `once(fn)`: обёртка, которая вызывает `fn` только при первом вызове.\n\n- Следующие вызовы `fn` не вызывают и возвращают результат первого.\n- `this` и аргументы первого вызова передаются в `fn`.",
    "starter": "function once(fn) {\n  \n}\n",
    "tests": [
      {
        "label": "вызывается один раз",
        "script": "(fn) => {\n  let calls = 0\n  const init = fn(() => ++calls)\n  return [init(), init(), init(), calls]\n}",
        "expected": [
          1,
          1,
          1,
          1
        ]
      },
      {
        "label": "аргументы первого вызова",
        "script": "(fn) => {\n  const f = fn((a, b) => a + b)\n  return [f(1, 2), f(10, 20)]\n}",
        "expected": [
          3,
          3
        ]
      },
      {
        "label": "this сохраняется",
        "script": "(fn) => {\n  const obj = { v: 'ок' }\n  obj.get = fn(function () { return this.v })\n  return obj.get()\n}",
        "expected": "ок"
      }
    ],
    "solution": "function once(fn) {\n  let called = false\n  let result\n  return function (...args) {\n    if (!called) {\n      called = true\n      result = fn.apply(this, args)\n    }\n    return result\n  }\n}"
  },
  {
    "id": "deep-clone",
    "set": "week",
    "fn": "deepClone",
    "title": "Глубокая копия",
    "card": null,
    "statement": "Напиши `deepClone(value)` — глубокую копию без `structuredClone` и без `JSON`.\n\n- Объекты и массивы копируются на всю глубину: изменение копии не задевает оригинал.\n- `Date` копируется в новый `Date` с тем же временем.\n- Примитивы, `null` и `undefined` возвращаются как есть.\n\nЦиклические ссылки можно не поддерживать — но скажи вслух, как бы ты их обработала.",
    "starter": "function deepClone(value) {\n  \n}\n",
    "tests": [
      {
        "label": "изменение копии не задевает оригинал",
        "script": "(fn) => {\n  const src = { a: [1, { b: 2 }], d: { e: 'x' } }\n  const copy = fn(src)\n  copy.a[1].b = 99\n  copy.d.e = 'y'\n  return [src.a[1].b, src.d.e, copy !== src, Array.isArray(copy.a)]\n}",
        "expected": [
          2,
          "x",
          true,
          true
        ]
      },
      {
        "label": "Date копируется",
        "script": "(fn) => {\n  const d = new Date(2026, 9, 26)\n  const c = fn({ d })\n  return [c.d instanceof Date, c.d !== d, c.d.getTime() === d.getTime()]\n}",
        "expected": [
          true,
          true,
          true
        ]
      },
      {
        "label": "примитивы и null",
        "script": "(fn) => [fn(1), fn('s'), fn(null), fn(undefined) === undefined]",
        "expected": [
          1,
          "s",
          null,
          true
        ]
      },
      {
        "label": "без structuredClone и JSON",
        "script": "(fn) => {\n  const sc = globalThis.structuredClone\n  const parse = JSON.parse\n  globalThis.structuredClone = () => { throw new Error('structuredClone использовать нельзя') }\n  JSON.parse = () => { throw new Error('JSON использовать нельзя') }\n  try {\n    const c = fn({ a: { b: [1] } })\n    return c.a.b[0]\n  } finally {\n    globalThis.structuredClone = sc\n    JSON.parse = parse\n  }\n}",
        "expected": 1
      }
    ],
    "solution": "function deepClone(value) {\n  if (value === null || typeof value !== 'object') return value // примитивы и функции — как есть\n  if (value instanceof Date) return new Date(value.getTime())\n  if (Array.isArray(value)) return value.map(deepClone)\n\n  const copy = {}\n  for (const [key, item] of Object.entries(value)) copy[key] = deepClone(item)\n  return copy\n}\n// Циклы: передавать вниз WeakMap «оригинал → копия» и при повторной\n// встрече возвращать уже созданную копию"
  },
  {
    "id": "chunk",
    "set": "week",
    "fn": "chunk",
    "title": "Разбить массив на части",
    "card": null,
    "statement": "Напиши `chunk(arr, size)`: разбивает массив на части по `size` элементов. Последняя часть может быть короче.\n\n`chunk([1, 2, 3, 4, 5], 2)` → `[[1, 2], [3, 4], [5]]`",
    "starter": "function chunk(arr, size) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            1,
            2,
            3,
            4,
            5
          ],
          2
        ],
        "expected": [
          [
            1,
            2
          ],
          [
            3,
            4
          ],
          [
            5
          ]
        ]
      },
      {
        "args": [
          [],
          3
        ],
        "expected": []
      },
      {
        "args": [
          [
            1,
            2
          ],
          5
        ],
        "expected": [
          [
            1,
            2
          ]
        ]
      },
      {
        "args": [
          [
            1,
            2,
            3
          ],
          1
        ],
        "expected": [
          [
            1
          ],
          [
            2
          ],
          [
            3
          ]
        ]
      }
    ],
    "solution": "function chunk(arr, size) {\n  const out = []\n  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))\n  return out\n}"
  },
  {
    "id": "merge-sorted",
    "set": "week",
    "fn": "mergeSorted",
    "title": "Слить два отсортированных массива",
    "card": null,
    "statement": "Напиши `mergeSorted(a, b)`: два массива чисел, каждый отсортирован по возрастанию. Верни один отсортированный массив.\n\n- Без `sort`: за один проход двумя указателями, O(n + m).\n- Исходные массивы не менять.",
    "starter": "function mergeSorted(a, b) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            1,
            4,
            7
          ],
          [
            2,
            3,
            8,
            9
          ]
        ],
        "expected": [
          1,
          2,
          3,
          4,
          7,
          8,
          9
        ]
      },
      {
        "args": [
          [],
          [
            1,
            2
          ]
        ],
        "expected": [
          1,
          2
        ]
      },
      {
        "args": [
          [
            1,
            1
          ],
          [
            1
          ]
        ],
        "expected": [
          1,
          1,
          1
        ]
      },
      {
        "args": [
          [
            -5,
            0
          ],
          [
            -3,
            10
          ]
        ],
        "expected": [
          -5,
          -3,
          0,
          10
        ]
      },
      {
        "label": "без sort",
        "script": "(fn) => {\n  const original = Array.prototype.sort\n  Array.prototype.sort = function () { throw new Error('sort использовать нельзя') }\n  try {\n    return fn([1, 3], [2])\n  } finally {\n    Array.prototype.sort = original\n  }\n}",
        "expected": [
          1,
          2,
          3
        ]
      }
    ],
    "solution": "function mergeSorted(a, b) {\n  const out = []\n  let i = 0\n  let j = 0\n  while (i < a.length && j < b.length) {\n    if (a[i] <= b[j]) out.push(a[i++])\n    else out.push(b[j++])\n  }\n  // Один из массивов кончился — хвост другого уже отсортирован\n  while (i < a.length) out.push(a[i++])\n  while (j < b.length) out.push(b[j++])\n  return out\n}"
  },
  {
    "id": "cached-fetcher",
    "set": "week",
    "fn": "createCachedFetcher",
    "title": "Кеш запросов с TTL",
    "card": null,
    "statement": "Напиши `createCachedFetcher(fetchFn, ttl)`: возвращает функцию `get(key)`, которая отдаёт промис с данными.\n\n- Одновременные вызовы с одним ключом делают **один** запрос и получают один и тот же ответ.\n- Ответ живёт в кеше `ttl` миллисекунд, потом запрос повторяется.\n- Ошибка не кешируется: следующий вызов пробует снова.\n\nТак устроен кеш в `useFetch` и в библиотеках вроде TanStack Query.",
    "starter": "function createCachedFetcher(fetchFn, ttl) {\n  \n}\n",
    "tests": [
      {
        "label": "одновременные вызовы — один запрос",
        "script": "async (fn, sleep) => {\n  let calls = 0\n  const get = fn(async (k) => { calls++; await sleep(20); return k + '!' }, 1000)\n  const [x, y] = await Promise.all([get('a'), get('a')])\n  return [x, y, calls]\n}",
        "expected": [
          "a!",
          "a!",
          1
        ]
      },
      {
        "label": "разные ключи — разные запросы",
        "script": "async (fn) => {\n  let calls = 0\n  const get = fn(async (k) => { calls++; return k }, 1000)\n  await get('a')\n  await get('b')\n  await get('a')\n  return calls\n}",
        "expected": 2
      },
      {
        "label": "после ttl — новый запрос",
        "script": "async (fn, sleep) => {\n  let calls = 0\n  const get = fn(async (k) => { calls++; return k }, 40)\n  await get('a')\n  await get('a')\n  await sleep(60)\n  await get('a')\n  return calls\n}",
        "expected": 2
      },
      {
        "label": "ошибка не кешируется",
        "script": "async (fn) => {\n  let calls = 0\n  const get = fn(async () => {\n    calls++\n    if (calls === 1) throw new Error('сбой')\n    return 'ок'\n  }, 1000)\n  try { await get('a') } catch (e) {}\n  return [await get('a'), calls]\n}",
        "expected": [
          "ок",
          2
        ]
      }
    ],
    "solution": "function createCachedFetcher(fetchFn, ttl) {\n  const cache = new Map() // ключ → { promise, time }\n\n  return function get(key) {\n    const hit = cache.get(key)\n    if (hit && Date.now() - hit.time < ttl) return hit.promise\n\n    // Кладём сам промис, а не результат: второй вызов до ответа получит тот же запрос\n    const promise = fetchFn(key).catch((err) => {\n      cache.delete(key) // ошибку не кешируем — следующий вызов попробует снова\n      throw err\n    })\n    cache.set(key, { promise, time: Date.now() })\n    return promise\n  }\n}"
  },
  {
    "id": "brackets",
    "set": "live",
    "fn": "isBalanced",
    "title": "Проверка скобок",
    "card": null,
    "statement": "Напиши функцию `isBalanced(str)`: возвращает `true`, если скобки в строке расставлены правильно.\n\n- Виды скобок: `()`, `[]`, `{}`.\n- Каждая открывающая должна быть закрыта скобкой того же вида и в правильном порядке: `([)]` — неверно.\n- Остальные символы игнорируются.\n- Пустая строка — верная.",
    "starter": "function isBalanced(str) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "()"
        ],
        "expected": true
      },
      {
        "args": [
          "([{}])"
        ],
        "expected": true
      },
      {
        "args": [
          "(]"
        ],
        "expected": false
      },
      {
        "args": [
          "(()"
        ],
        "expected": false
      },
      {
        "args": [
          ")("
        ],
        "expected": false
      },
      {
        "args": [
          ""
        ],
        "expected": true
      },
      {
        "args": [
          "a(b)c[d]"
        ],
        "expected": true
      },
      {
        "args": [
          "([)]"
        ],
        "expected": false
      },
      {
        "args": [
          "{[()()]}"
        ],
        "expected": true
      },
      {
        "args": [
          "}"
        ],
        "expected": false
      }
    ],
    "solution": "function isBalanced(str) {\n  const pairs = { ')': '(', ']': '[', '}': '{' }\n  const stack = []\n  for (const ch of str) {\n    if (ch === '(' || ch === '[' || ch === '{') {\n      stack.push(ch)\n    } else if (pairs[ch]) {\n      // закрывающая: на вершине стека должна лежать её пара\n      if (stack.pop() !== pairs[ch]) return false\n    }\n  }\n  return stack.length === 0 // не осталось незакрытых\n}"
  },
  {
    "id": "compress",
    "set": "live",
    "fn": "compress",
    "title": "Сжатие строки",
    "card": null,
    "statement": "Напиши функцию `compress(str)`: заменяет подряд идущие одинаковые символы на символ и их количество.\n\n- `'aaabbc'` → `'a3b2c'`.\n- Одиночный символ остаётся без числа.\n- Считаются именно серии подряд: `'aabbaa'` → `'a2b2a2'`, а не `'a4b2'`.\n- Пустая строка возвращается как есть.",
    "starter": "function compress(str) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "aaabbc"
        ],
        "expected": "a3b2c"
      },
      {
        "args": [
          "abc"
        ],
        "expected": "abc"
      },
      {
        "args": [
          ""
        ],
        "expected": ""
      },
      {
        "args": [
          "aaaaaaaaaaaa"
        ],
        "expected": "a12"
      },
      {
        "args": [
          "aabbaa"
        ],
        "expected": "a2b2a2"
      },
      {
        "args": [
          "a"
        ],
        "expected": "a"
      },
      {
        "args": [
          "aab"
        ],
        "expected": "a2b"
      },
      {
        "args": [
          "abb"
        ],
        "expected": "ab2"
      }
    ],
    "solution": "function compress(str) {\n  let out = ''\n  let count = 1\n  for (let i = 0; i < str.length; i++) {\n    if (str[i] === str[i + 1]) {\n      count++ // серия продолжается\n    } else {\n      out += str[i] + (count > 1 ? count : '')\n      count = 1\n    }\n  }\n  return out\n}"
  },
  {
    "id": "intersection",
    "set": "live",
    "fn": "intersection",
    "title": "Пересечение массивов",
    "card": "al-010",
    "statement": "Напиши функцию `intersection(a, b)`: возвращает элементы, которые есть в обоих массивах.\n\n- Без повторов.\n- Порядок — как в первом массиве.\n- Исходные массивы менять нельзя.\n- Цель — не квадратичное решение: не `includes` внутри цикла.",
    "starter": "function intersection(a, b) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            1,
            2,
            3,
            4
          ],
          [
            3,
            4,
            5
          ]
        ],
        "expected": [
          3,
          4
        ]
      },
      {
        "args": [
          [
            1,
            1,
            2
          ],
          [
            1
          ]
        ],
        "expected": [
          1
        ]
      },
      {
        "args": [
          [],
          [
            1
          ]
        ],
        "expected": []
      },
      {
        "args": [
          [
            "a",
            "b"
          ],
          [
            "b",
            "a"
          ]
        ],
        "expected": [
          "a",
          "b"
        ]
      },
      {
        "args": [
          [
            1,
            2
          ],
          [
            3
          ]
        ],
        "expected": []
      },
      {
        "args": [
          [
            3,
            1,
            2,
            1
          ],
          [
            1,
            2,
            3
          ]
        ],
        "expected": [
          3,
          1,
          2
        ]
      },
      {
        "label": "исходные массивы не изменились",
        "script": "(fn) => { const a = [2, 1, 2]; const b = [2]; fn(a, b); return [a, b] }",
        "expected": [
          [
            2,
            1,
            2
          ],
          [
            2
          ]
        ]
      }
    ],
    "solution": "function intersection(a, b) {\n  const inB = new Set(b) // проверка has — за O(1)\n  const seen = new Set()\n  const out = []\n  for (const item of a) {\n    if (inB.has(item) && !seen.has(item)) {\n      seen.add(item)\n      out.push(item)\n    }\n  }\n  return out\n}\n\n// Короче, с тем же результатом:\n// const inB = new Set(b)\n// return [...new Set(a)].filter((x) => inB.has(x))"
  },
  {
    "id": "sort-users",
    "set": "live",
    "fn": "sortUsers",
    "title": "Сортировка по двум полям",
    "card": null,
    "statement": "Напиши функцию `sortUsers(users)`. На входе массив объектов `{ name, rank }`.\n\n- Сначала идут пользователи с большим `rank`.\n- При равном `rank` — по имени по алфавиту.\n- Исходный массив менять нельзя: вернуть новый.",
    "starter": "function sortUsers(users) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            {
              "name": "Яна",
              "rank": 2
            },
            {
              "name": "Аня",
              "rank": 5
            },
            {
              "name": "Борис",
              "rank": 2
            }
          ]
        ],
        "expected": [
          {
            "name": "Аня",
            "rank": 5
          },
          {
            "name": "Борис",
            "rank": 2
          },
          {
            "name": "Яна",
            "rank": 2
          }
        ],
        "label": "sortUsers(три пользователя, у двоих равный rank)"
      },
      {
        "args": [
          [
            {
              "name": "А",
              "rank": 9
            },
            {
              "name": "Б",
              "rank": 10
            },
            {
              "name": "В",
              "rank": 100
            }
          ]
        ],
        "expected": [
          {
            "name": "В",
            "rank": 100
          },
          {
            "name": "Б",
            "rank": 10
          },
          {
            "name": "А",
            "rank": 9
          }
        ],
        "label": "rank сравнивается как число: 100, 10, 9"
      },
      {
        "args": [
          [
            {
              "name": "Олег",
              "rank": 1
            },
            {
              "name": "Вера",
              "rank": 1
            },
            {
              "name": "Дима",
              "rank": 1
            }
          ]
        ],
        "expected": [
          {
            "name": "Вера",
            "rank": 1
          },
          {
            "name": "Дима",
            "rank": 1
          },
          {
            "name": "Олег",
            "rank": 1
          }
        ],
        "label": "у всех равный rank → по имени"
      },
      {
        "args": [
          []
        ],
        "expected": []
      },
      {
        "label": "исходный массив не изменился",
        "script": "(fn) => { const users = [{ name: 'Б', rank: 1 }, { name: 'А', rank: 2 }]; fn(users); return users.map((u) => u.name) }",
        "expected": [
          "Б",
          "А"
        ]
      }
    ],
    "solution": "function sortUsers(users) {\n  return [...users].sort(\n    // разность даёт число; при равном rank она равна 0, и срабатывает сравнение имён\n    (a, b) => b.rank - a.rank || a.name.localeCompare(b.name, 'ru'),\n  )\n}"
  },
  {
    "id": "palindrome",
    "set": "mon",
    "fn": "isPalindrome",
    "title": "Палиндром",
    "card": null,
    "statement": "Напиши функцию `isPalindrome(str)`: возвращает `true`, если строка читается одинаково слева направо и справа налево.\n\n- Регистр не важен.\n- Учитываются только буквы и цифры — латиница и кириллица. Пробелы и знаки препинания пропускаются.\n- Пустая строка — палиндром.",
    "starter": "function isPalindrome(str) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "А роза упала на лапу Азора"
        ],
        "expected": true
      },
      {
        "args": [
          "Hello"
        ],
        "expected": false
      },
      {
        "args": [
          ""
        ],
        "expected": true
      },
      {
        "args": [
          "Was it a car or a cat I saw?"
        ],
        "expected": true
      },
      {
        "args": [
          "ab"
        ],
        "expected": false
      },
      {
        "args": [
          "12321"
        ],
        "expected": true
      },
      {
        "args": [
          "Топот!"
        ],
        "expected": true
      }
    ],
    "solution": "function isPalindrome(str) {\n  const clean = str.toLowerCase().replace(/[^a-zа-яё0-9]/g, '')\n  for (let i = 0, j = clean.length - 1; i < j; i++, j--) {\n    if (clean[i] !== clean[j]) return false\n  }\n  return true\n}"
  },
  {
    "id": "frequent",
    "set": "mon",
    "fn": "mostFrequentChar",
    "title": "Самый частый символ",
    "card": null,
    "statement": "Напиши функцию `mostFrequentChar(str)`: возвращает символ, который встречается в строке чаще всего.\n\n- Пробелы не считаются.\n- Если лидеров несколько — вернуть того, кто встретился в строке раньше.\n- Для пустой строки вернуть пустую строку.",
    "starter": "function mostFrequentChar(str) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "hello"
        ],
        "expected": "l"
      },
      {
        "args": [
          "aabb"
        ],
        "expected": "a"
      },
      {
        "args": [
          "мама мыла раму"
        ],
        "expected": "м"
      },
      {
        "args": [
          ""
        ],
        "expected": ""
      },
      {
        "args": [
          "abcabcc"
        ],
        "expected": "c"
      },
      {
        "args": [
          "   "
        ],
        "expected": ""
      },
      {
        "args": [
          "a b c d a"
        ],
        "expected": "a"
      },
      {
        "args": [
          "2211"
        ],
        "expected": "2"
      },
      {
        "args": [
          "b1b1"
        ],
        "expected": "b"
      }
    ],
    "solution": "function mostFrequentChar(str) {\n  const counts = new Map()\n  for (const ch of str) {\n    if (ch === ' ') continue\n    counts.set(ch, (counts.get(ch) ?? 0) + 1)\n  }\n  let best = ''\n  let max = 0\n  // Map хранит порядок вставки, поэтому при равенстве побеждает первый\n  for (const [ch, n] of counts) {\n    if (n > max) {\n      max = n\n      best = ch\n    }\n  }\n  return best\n}"
  },
  {
    "id": "unique",
    "set": "mon",
    "fn": "unique",
    "title": "Убрать дубликаты",
    "card": "al-010",
    "statement": "Напиши функцию `unique(arr)`: возвращает новый массив без повторов.\n\n- Порядок — по первому появлению элемента.\n- Исходный массив менять нельзя.\n- `1` и `'1'` — разные значения.",
    "starter": "function unique(arr) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            1,
            2,
            2,
            3,
            1
          ]
        ],
        "expected": [
          1,
          2,
          3
        ]
      },
      {
        "args": [
          [
            "a",
            "b",
            "a"
          ]
        ],
        "expected": [
          "a",
          "b"
        ]
      },
      {
        "args": [
          []
        ],
        "expected": []
      },
      {
        "args": [
          [
            1,
            "1",
            1
          ]
        ],
        "expected": [
          1,
          "1"
        ]
      },
      {
        "label": "исходный массив не изменился",
        "script": "(fn) => { const input = [3, 3, 1]; fn(input); return input }",
        "expected": [
          3,
          3,
          1
        ]
      }
    ],
    "solution": "function unique(arr) {\n  return [...new Set(arr)]\n}\n\n// То же без Set — чтобы понимать, что он делает:\n// function unique(arr) {\n//   const seen = new Set()\n//   const out = []\n//   for (const item of arr) {\n//     if (seen.has(item)) continue\n//     seen.add(item)\n//     out.push(item)\n//   }\n//   return out\n// }"
  },
  {
    "id": "anagram",
    "set": "tue",
    "fn": "isAnagram",
    "title": "Анаграммы",
    "card": null,
    "statement": "Напиши функцию `isAnagram(a, b)`: возвращает `true`, если строки состоят из одних и тех же букв в одинаковом количестве.\n\n- Регистр и пробелы не важны.\n- Две пустые строки — анаграммы.",
    "starter": "function isAnagram(a, b) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "listen",
          "silent"
        ],
        "expected": true
      },
      {
        "args": [
          "Апельсин",
          "Спаниель"
        ],
        "expected": true
      },
      {
        "args": [
          "aab",
          "abb"
        ],
        "expected": false
      },
      {
        "args": [
          "abc",
          "abcd"
        ],
        "expected": false
      },
      {
        "args": [
          "",
          ""
        ],
        "expected": true
      },
      {
        "args": [
          "Dormitory",
          "dirty room"
        ],
        "expected": true
      }
    ],
    "solution": "function isAnagram(a, b) {\n  const norm = (s) => s.toLowerCase().replaceAll(' ', '')\n  const x = norm(a)\n  const y = norm(b)\n  if (x.length !== y.length) return false\n\n  const counts = new Map()\n  for (const ch of x) counts.set(ch, (counts.get(ch) ?? 0) + 1)\n  for (const ch of y) {\n    if (!counts.get(ch)) return false\n    counts.set(ch, counts.get(ch) - 1)\n  }\n  return true\n}"
  },
  {
    "id": "groupby",
    "set": "tue",
    "fn": "groupBy",
    "title": "Группировка по ключу",
    "card": "al-022",
    "statement": "Напиши функцию `groupBy(arr, key)`: раскладывает элементы массива по группам и возвращает объект, где ключ — название группы, а значение — массив её элементов.\n\n- `key` — либо имя свойства (строка), либо функция, которая по элементу возвращает название группы.\n- Порядок элементов внутри группы — как в исходном массиве.\n- Для пустого массива вернуть пустой объект.",
    "starter": "function groupBy(arr, key) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            {
              "name": "Аня",
              "role": "dev"
            },
            {
              "name": "Олег",
              "role": "qa"
            },
            {
              "name": "Ира",
              "role": "dev"
            }
          ],
          "role"
        ],
        "expected": {
          "dev": [
            {
              "name": "Аня",
              "role": "dev"
            },
            {
              "name": "Ира",
              "role": "dev"
            }
          ],
          "qa": [
            {
              "name": "Олег",
              "role": "qa"
            }
          ]
        },
        "label": "groupBy(люди, \"role\")"
      },
      {
        "label": "groupBy([1, 2, 3, 4, 5], чётное или нечётное)",
        "script": "(fn) => fn([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? 'even' : 'odd'))",
        "expected": {
          "odd": [
            1,
            3,
            5
          ],
          "even": [
            2,
            4
          ]
        }
      },
      {
        "args": [
          [],
          "role"
        ],
        "expected": {}
      },
      {
        "label": "groupBy([\"яблоко\", \"ягода\", \"арбуз\"], первая буква)",
        "script": "(fn) => fn(['яблоко', 'ягода', 'арбуз'], (w) => w[0])",
        "expected": {
          "я": [
            "яблоко",
            "ягода"
          ],
          "а": [
            "арбуз"
          ]
        }
      }
    ],
    "solution": "function groupBy(arr, key) {\n  const getKey = typeof key === 'function' ? key : (item) => item[key]\n  const groups = {}\n  for (const item of arr) {\n    const k = getKey(item)\n    if (!groups[k]) groups[k] = []\n    groups[k].push(item)\n  }\n  return groups\n}"
  },
  {
    "id": "twosum",
    "set": "tue",
    "fn": "twoSum",
    "title": "Сумма двух",
    "card": "al-002",
    "statement": "Напиши функцию `twoSum(nums, target)`: находит в массиве два числа, которые в сумме дают `target`, и возвращает их индексы `[i, j]`, где `i < j`.\n\n- Один и тот же элемент дважды брать нельзя.\n- Если пары нет — вернуть `null`.\n- Цель — один проход по массиву, а не два вложенных цикла.",
    "starter": "function twoSum(nums, target) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            2,
            7,
            11,
            15
          ],
          9
        ],
        "expected": [
          0,
          1
        ]
      },
      {
        "args": [
          [
            3,
            2,
            4
          ],
          6
        ],
        "expected": [
          1,
          2
        ]
      },
      {
        "args": [
          [
            3,
            3
          ],
          6
        ],
        "expected": [
          0,
          1
        ]
      },
      {
        "args": [
          [
            1,
            2
          ],
          10
        ],
        "expected": null
      },
      {
        "args": [
          [
            -1,
            5,
            4,
            1
          ],
          0
        ],
        "expected": [
          0,
          3
        ]
      }
    ],
    "solution": "function twoSum(nums, target) {\n  const seen = new Map() // число -> его индекс\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i]\n    if (seen.has(need)) return [seen.get(need), i]\n    seen.set(nums[i], i)\n  }\n  return null\n}"
  },
  {
    "id": "debounce",
    "set": "tue",
    "fn": "debounce",
    "title": "debounce",
    "card": "js-017",
    "statement": "Напиши функцию `debounce(fn, ms)`: возвращает обёртку, которая откладывает вызов `fn`.\n\n- `fn` вызывается через `ms` миллисекунд после **последнего** вызова обёртки.\n- Если обёртку вызвали снова раньше, чем прошло `ms`, отсчёт начинается заново.\n- `fn` получает аргументы последнего вызова.\n\nТипичное применение — поле поиска: запрос уходит, когда человек перестал печатать.",
    "starter": "function debounce(fn, ms) {\n  \n}\n",
    "tests": [
      {
        "label": "три быстрых вызова → срабатывает один раз, с последним аргументом",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const d = fn((x) => calls.push(x), 60)\n  d(1); d(2); d(3)\n  await sleep(150)\n  return calls\n}",
        "expected": [
          3
        ]
      },
      {
        "label": "пока пауза не выдержана, вызова нет",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const d = fn((x) => calls.push(x), 80)\n  d('a')\n  await sleep(25)\n  return calls\n}",
        "expected": []
      },
      {
        "label": "каждый новый вызов сдвигает срок",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const d = fn((x) => calls.push(x), 60)\n  d(1)\n  await sleep(35)\n  d(2)\n  await sleep(35)\n  const early = calls.length\n  await sleep(80)\n  return [early, calls]\n}",
        "expected": [
          0,
          [
            2
          ]
        ]
      },
      {
        "label": "две серии с паузой между ними → два вызова",
        "script": "async (fn, sleep) => {\n  const calls = []\n  const d = fn((a, b) => calls.push(a + b), 40)\n  d(1, 1); d(2, 2)\n  await sleep(120)\n  d(5, 5)\n  await sleep(120)\n  return calls\n}",
        "expected": [
          4,
          10
        ]
      }
    ],
    "solution": "function debounce(fn, ms) {\n  let timer\n  return function (...args) {\n    clearTimeout(timer)\n    timer = setTimeout(() => fn.apply(this, args), ms)\n  }\n}"
  },
  {
    "id": "vue-counter",
    "set": "vue",
    "env": "vue",
    "fn": "useCounter",
    "title": "Composable: счётчик",
    "card": "vue-2-5",
    "statement": "Напиши composable `useCounter(initial = 0)`. Он возвращает объект:\n\n- `count` — ref с текущим значением;\n- `double` — вычисляемое значение, вдвое больше `count`;\n- `inc()` — увеличивает `count` на 1;\n- `reset()` — возвращает `count` к начальному значению.\n\nДва вызова `useCounter` должны давать независимые счётчики.\n\n`ref`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useCounter(initial = 0) {\n  \n}\n",
    "tests": [
      {
        "label": "начальное значение и double",
        "script": "(fn) => { const c = fn(5); return [c.count.value, c.double.value] }",
        "expected": [
          5,
          10
        ]
      },
      {
        "label": "два inc() → count и double обновились",
        "script": "(fn) => { const c = fn(); c.inc(); c.inc(); return [c.count.value, c.double.value] }",
        "expected": [
          2,
          4
        ]
      },
      {
        "label": "reset() возвращает начальное значение",
        "script": "(fn) => { const c = fn(3); c.inc(); c.reset(); return c.count.value }",
        "expected": 3
      },
      {
        "label": "double — вычисляемое: следует за count и при прямой записи в него",
        "script": "(fn, sleep, t) => { const c = fn(1); c.count.value = 7; return [t.isRef(c.double), c.double.value] }",
        "expected": [
          true,
          14
        ]
      },
      {
        "label": "два счётчика не зависят друг от друга",
        "script": "(fn) => { const a = fn(); const b = fn(10); a.inc(); return [a.count.value, b.count.value] }",
        "expected": [
          1,
          10
        ]
      }
    ],
    "solution": "function useCounter(initial = 0) {\n  const count = ref(initial)\n  const double = computed(() => count.value * 2)\n  const inc = () => count.value++\n  const reset = () => {\n    count.value = initial\n  }\n  return { count, double, inc, reset }\n}"
  },
  {
    "id": "vue-todos",
    "set": "vue",
    "env": "vue",
    "fn": "useTodos",
    "title": "Composable: список задач с фильтром",
    "card": "vue-2-2",
    "statement": "Напиши composable `useTodos()`. Он возвращает:\n\n- `todos` — ref с массивом задач вида `{ id, title, done }`;\n- `filter` — ref: `'all'`, `'active'` или `'done'`; по умолчанию `'all'`;\n- `visible` — вычисляемый список задач под текущий фильтр;\n- `left` — вычисляемое число невыполненных задач;\n- `add(title)` — добавляет задачу; `id` идут по порядку с 1, `done` — `false`; пустой заголовок и заголовок из одних пробелов игнорируется;\n- `toggle(id)` — переключает `done`;\n- `remove(id)` — удаляет задачу.\n\n`ref`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useTodos() {\n  \n}\n",
    "tests": [
      {
        "label": "add() добавляет задачи с id по порядку",
        "script": "(fn) => { const t = fn(); t.add('чай'); t.add('код'); return t.todos.value }",
        "expected": [
          {
            "id": 1,
            "title": "чай",
            "done": false
          },
          {
            "id": 2,
            "title": "код",
            "done": false
          }
        ]
      },
      {
        "label": "пустой заголовок не добавляется",
        "script": "(fn) => { const t = fn(); t.add(''); t.add('   '); return t.todos.value.length }",
        "expected": 0
      },
      {
        "label": "toggle() и left",
        "script": "(fn) => { const t = fn(); t.add('a'); t.add('b'); t.add('c'); t.toggle(2); return [t.left.value, t.todos.value[1].done] }",
        "expected": [
          2,
          true
        ]
      },
      {
        "label": "visible следует за filter",
        "script": "(fn) => {\n  const t = fn(); t.add('a'); t.add('b'); t.toggle(1)\n  const titles = () => t.visible.value.map((x) => x.title)\n  const all = titles()\n  t.filter.value = 'active'; const active = titles()\n  t.filter.value = 'done'; const done = titles()\n  return [all, active, done]\n}",
        "expected": [
          [
            "a",
            "b"
          ],
          [
            "b"
          ],
          [
            "a"
          ]
        ]
      },
      {
        "label": "remove() удаляет, id следующей задачи не повторяется",
        "script": "(fn) => { const t = fn(); t.add('a'); t.add('b'); t.remove(1); t.add('c'); return t.todos.value.map((x) => [x.id, x.title]) }",
        "expected": [
          [
            2,
            "b"
          ],
          [
            3,
            "c"
          ]
        ]
      }
    ],
    "solution": "function useTodos() {\n  const todos = ref([])\n  const filter = ref('all')\n  let nextId = 1\n\n  const visible = computed(() => {\n    if (filter.value === 'active') return todos.value.filter((t) => !t.done)\n    if (filter.value === 'done') return todos.value.filter((t) => t.done)\n    return todos.value\n  })\n  const left = computed(() => todos.value.filter((t) => !t.done).length)\n\n  function add(title) {\n    const text = title.trim()\n    if (!text) return\n    todos.value.push({ id: nextId++, title: text, done: false })\n  }\n  function toggle(id) {\n    const todo = todos.value.find((t) => t.id === id)\n    if (todo) todo.done = !todo.done\n  }\n  function remove(id) {\n    todos.value = todos.value.filter((t) => t.id !== id)\n  }\n\n  return { todos, filter, visible, left, add, toggle, remove }\n}"
  },
  {
    "id": "vue-search",
    "set": "vue",
    "env": "vue",
    "fn": "useSearch",
    "title": "watch: поиск без устаревших ответов",
    "card": "vue-2-6",
    "statement": "Напиши composable `useSearch(query, search)`.\n\n- `query` — ref со строкой запроса.\n- `search(text)` — функция, которая возвращает промис с массивом результатов.\n- Вернуть нужно `{ results, loading }`: ref с массивом и ref с булевым флагом.\n\nПоведение:\n\n- при каждом изменении `query` запускается `search` с новым значением;\n- пока запрос идёт, `loading` равен `true`;\n- пустой запрос (после `trim`) не отправляется: `results` становится `[]`;\n- **ответ на устаревший запрос не должен перезаписать свежий**, даже если пришёл позже.\n\nПри создании поиск не запускается — только при изменении `query`.\n\n`ref`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt.",
    "starter": "function useSearch(query, search) {\n  \n}\n",
    "tests": [
      {
        "label": "изменение query запускает поиск и кладёт результат",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('')\n  const s = fn(q, async (text) => [text + '1', text + '2'])\n  q.value = 'vue'\n  await sleep(30)\n  return [s.results.value, s.loading.value]\n}",
        "expected": [
          [
            "vue1",
            "vue2"
          ],
          false
        ]
      },
      {
        "label": "при создании поиск не запускается",
        "script": "async (fn, sleep, t) => {\n  let calls = 0\n  const s = fn(t.ref('vue'), async () => { calls++; return [] })\n  await sleep(20)\n  return calls\n}",
        "expected": 0
      },
      {
        "label": "пока запрос идёт, loading равен true",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('')\n  const s = fn(q, async () => { await sleep(60); return ['x'] })\n  q.value = 'a'\n  await sleep(20)\n  const during = s.loading.value\n  await sleep(80)\n  return [during, s.loading.value]\n}",
        "expected": [
          true,
          false
        ]
      },
      {
        "label": "пустой запрос не отправляется, results очищается",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('')\n  const seen = []\n  const s = fn(q, async (text) => { seen.push(text); return [text] })\n  q.value = 'a'\n  await sleep(20)\n  q.value = '   '\n  await sleep(20)\n  return [seen, s.results.value]\n}",
        "expected": [
          [
            "a"
          ],
          []
        ]
      },
      {
        "label": "медленный старый ответ не затирает быстрый новый",
        "script": "async (fn, sleep, t) => {\n  const q = t.ref('')\n  const s = fn(q, async (text) => { await sleep(text === 'старый' ? 90 : 10); return [text] })\n  q.value = 'старый'\n  await sleep(15)\n  q.value = 'новый'\n  await sleep(150)\n  return [s.results.value, s.loading.value]\n}",
        "expected": [
          [
            "новый"
          ],
          false
        ]
      }
    ],
    "solution": "function useSearch(query, search) {\n  const results = ref([])\n  const loading = ref(false)\n\n  watch(query, async (text, _old, onCleanup) => {\n    // Флаг «этот запуск устарел»: watch вызовет очистку перед следующим запуском\n    let stale = false\n    onCleanup(() => {\n      stale = true\n    })\n\n    const q = text.trim()\n    if (!q) {\n      results.value = []\n      loading.value = false\n      return\n    }\n\n    loading.value = true\n    const found = await search(q)\n    if (stale) return // пришёл ответ на старый запрос — выбрасываем\n    results.value = found\n    loading.value = false\n  })\n\n  return { results, loading }\n}"
  },
  {
    "id": "pinia-cart",
    "set": "vue",
    "env": "vue",
    "fn": "useCartStore",
    "title": "Pinia: стор корзины",
    "card": "vue-3-1",
    "statement": "Объяви стор корзины: `const useCartStore = defineStore('cart', …)`. Подойдёт любой синтаксис — с объектом или с функцией.\n\nСостояние:\n\n- `items` — массив позиций `{ id, title, price, qty }`.\n\nВычисляемые значения:\n\n- `count` — сколько всего штук товара;\n- `total` — общая стоимость.\n\nДействия:\n\n- `add(product)` — принимает `{ id, title, price }`. Если товар уже в корзине, увеличивает его `qty` на 1, иначе добавляет с `qty: 1`;\n- `remove(id)` — убирает позицию целиком;\n- `clear()` — очищает корзину.\n\n`defineStore` и `storeToRefs` доступны без импорта.",
    "starter": "const useCartStore = defineStore('cart', {\n  \n})\n",
    "tests": [
      {
        "label": "add() дважды для одного товара → одна позиция, qty: 2",
        "script": "(fn) => {\n  const cart = fn()\n  cart.add({ id: 1, title: 'Чай', price: 100 }); cart.add({ id: 1, title: 'Чай', price: 100 })\n  return cart.items.map((i) => [i.id, i.qty])\n}",
        "expected": [
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "count и total",
        "script": "(fn) => {\n  const cart = fn()\n  cart.add({ id: 1, title: 'Чай', price: 100 }); cart.add({ id: 1, title: 'Чай', price: 100 }); cart.add({ id: 2, title: 'Мёд', price: 350 })\n  return [cart.count, cart.total]\n}",
        "expected": [
          3,
          550
        ]
      },
      {
        "label": "remove() убирает позицию целиком",
        "script": "(fn) => {\n  const cart = fn()\n  cart.add({ id: 1, title: 'Чай', price: 100 }); cart.add({ id: 2, title: 'Мёд', price: 350 }); cart.remove(1)\n  return [cart.items.map((i) => i.id), cart.total]\n}",
        "expected": [
          [
            2
          ],
          350
        ]
      },
      {
        "label": "total остаётся реактивным через storeToRefs",
        "script": "(fn, sleep, t) => {\n  const cart = fn()\n  const { total } = t.storeToRefs(cart)\n  const before = total.value\n  cart.add({ id: 5, title: 'Кофе', price: 500 })\n  return [before, total.value]\n}",
        "expected": [
          0,
          500
        ]
      },
      {
        "label": "clear() очищает корзину",
        "script": "(fn) => {\n  const cart = fn()\n  cart.add({ id: 1, title: 'Чай', price: 100 }); cart.clear()\n  return [cart.items.length, cart.count, cart.total]\n}",
        "expected": [
          0,
          0,
          0
        ]
      },
      {
        "label": "товар из add() не меняется снаружи: в корзине своя копия",
        "script": "(fn) => {\n  const cart = fn()\n  const product = { id: 1, title: 'Чай', price: 100 }\n  cart.add(product)\n  return Object.keys(product).sort()\n}",
        "expected": [
          "id",
          "price",
          "title"
        ]
      }
    ],
    "solution": "const useCartStore = defineStore('cart', {\n  state: () => ({ items: [] }),\n  getters: {\n    count: (state) => state.items.reduce((sum, i) => sum + i.qty, 0),\n    total: (state) => state.items.reduce((sum, i) => sum + i.price * i.qty, 0),\n  },\n  actions: {\n    add(product) {\n      const found = this.items.find((i) => i.id === product.id)\n      if (found) found.qty += 1\n      else this.items.push({ ...product, qty: 1 }) // копия: чужой объект не трогаем\n    },\n    remove(id) {\n      this.items = this.items.filter((i) => i.id !== id)\n    },\n    clear() {\n      this.items = []\n    },\n  },\n})\n\n// То же в setup-синтаксисе:\n// const useCartStore = defineStore('cart', () => {\n//   const items = ref([])\n//   const count = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))\n//   const total = computed(() => items.value.reduce((sum, i) => sum + i.price * i.qty, 0))\n//   function add(product) { … }\n//   return { items, count, total, add, remove, clear }\n// })"
  },
  {
    "id": "nuxt-middleware",
    "set": "vue",
    "env": "vue",
    "fn": "default",
    "title": "Nuxt: middleware авторизации",
    "card": "vue-6-5",
    "statement": "Напиши route middleware `middleware/auth.ts`:\n\n```js\nexport default defineNuxtRouteMiddleware((to, from) => {\n  // …\n})\n```\n\n- Текущий пользователь лежит в `useState('user')`: объект или пусто.\n- Пользователя нет → вернуть `navigateTo({ path: '/login', query: { back: to.fullPath } })`.\n- Пользователь есть → ничего не возвращать: переход продолжается.\n- На саму страницу `/login` пускать всегда, иначе получится бесконечный редирект.\n\nФункции Nuxt здесь подставные: тест смотрит, как ты их вызвала и что вернула.",
    "starter": "export default defineNuxtRouteMiddleware((to, from) => {\n  \n})\n",
    "tests": [
      {
        "label": "пользователя нет → редирект на /login с адресом возврата",
        "script": "(fn) => {\n  const r = fn({ path: '/cart', fullPath: '/cart?step=2' }, { path: '/' })\n  return r && r.__navigateTo ? r.to : 'редиректа нет'\n}",
        "expected": {
          "path": "/login",
          "query": {
            "back": "/cart?step=2"
          }
        }
      },
      {
        "label": "пользователь есть → переход продолжается",
        "script": "(fn, sleep, t) => {\n  t.useState('user').value = { id: 1 }\n  const r = fn({ path: '/cart', fullPath: '/cart' }, { path: '/' })\n  return r === undefined ? 'переход продолжается' : 'что-то вернули'\n}",
        "expected": "переход продолжается"
      },
      {
        "label": "на /login пускает без пользователя — иначе цикл",
        "script": "(fn) => {\n  const r = fn({ path: '/login', fullPath: '/login?back=%2Fcart' }, { path: '/cart' })\n  return r === undefined ? 'переход продолжается' : 'редирект'\n}",
        "expected": "переход продолжается"
      },
      {
        "label": "результат navigateTo возвращён, а не просто вызван",
        "script": "(fn, sleep, t) => {\n  const r = fn({ path: '/orders', fullPath: '/orders' }, { path: '/' })\n  return [t.nuxt.calls.navigateTo.length, !!(r && r.__navigateTo)]\n}",
        "expected": [
          1,
          true
        ]
      }
    ],
    "solution": "export default defineNuxtRouteMiddleware((to, from) => {\n  if (to.path === '/login') return\n\n  const user = useState('user')\n  if (!user.value) {\n    return navigateTo({ path: '/login', query: { back: to.fullPath } })\n  }\n})"
  },
  {
    "id": "nuxt-product",
    "set": "vue",
    "env": "vue",
    "fn": "useProduct",
    "title": "Nuxt: товар по параметру маршрута",
    "card": "vue-7-4",
    "statement": "Страница `pages/products/[id].vue`. Напиши её загрузку данных функцией `async function useProduct()`:\n\n- id товара взять из `useRoute().params.id`;\n- загрузить через `useFetch` по адресу `/api/products/<id>`. Адрес должен быть **реактивным**: при смене `id` запрос обязан повториться;\n- если товара нет (`data.value` пусто) — бросить `createError({ statusCode: 404, statusMessage: 'Товар не найден', fatal: true })`;\n- вернуть `{ product, status }`, где `product` — это `data` из `useFetch`.\n\nФункции Nuxt здесь подставные: тест смотрит, как ты их вызвала и что вернула.",
    "starter": "async function useProduct() {\n  \n}\n",
    "tests": [
      {
        "label": "useFetch получил адрес /api/products/42",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.id = '42'\n  t.nuxt.fetchData = { id: 42, title: 'Чайник' }\n  await fn()\n  const url = t.nuxt.calls.useFetch[0].url\n  return typeof url === 'function' ? url() : t.unref(url)\n}",
        "expected": "/api/products/42"
      },
      {
        "label": "адрес реактивный: после смены id тот же источник даёт новый адрес",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.id = '42'\n  t.nuxt.fetchData = { id: 42 }\n  await fn()\n  const url = t.nuxt.calls.useFetch[0].url\n  t.nuxt.route.params.id = '7'\n  if (typeof url === 'string') return 'строка: собрана один раз и не изменится'\n  return typeof url === 'function' ? url() : t.unref(url)\n}",
        "expected": "/api/products/7"
      },
      {
        "label": "товар найден → возвращает { product, status }",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.id = '42'\n  t.nuxt.fetchData = { id: 42, title: 'Чайник' }\n  const r = await fn()\n  return [t.unref(r.product), t.unref(r.status)]\n}",
        "expected": [
          {
            "id": 42,
            "title": "Чайник"
          },
          "success"
        ]
      },
      {
        "label": "товара нет → ошибка 404, фатальная",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.route.params.id = '999'\n  t.nuxt.fetchData = null\n  try {\n    await fn()\n    return 'ошибки нет'\n  } catch (e) {\n    return [e.statusCode, e.statusMessage, e.fatal]\n  }\n}",
        "expected": [
          404,
          "Товар не найден",
          true
        ]
      }
    ],
    "solution": "async function useProduct() {\n  const route = useRoute()\n\n  // Геттер, а не готовая строка: useFetch следит за ним и повторяет запрос\n  const { data, status } = await useFetch(() => `/api/products/${route.params.id}`)\n\n  if (!data.value) {\n    throw createError({ statusCode: 404, statusMessage: 'Товар не найден', fatal: true })\n  }\n\n  return { product: data, status }\n}"
  },
  {
    "id": "nuxt-form",
    "set": "vue",
    "env": "vue",
    "fn": "useOrderForm",
    "title": "Nuxt: отправка формы через $fetch",
    "card": "vue-7-6",
    "statement": "Напиши composable `useOrderForm()`. Он возвращает `{ form, pending, error, submit }`:\n\n- `form` — реактивный объект `{ email: '', comment: '' }`;\n- `pending` — ref, `true` пока идёт отправка;\n- `error` — ref со строкой ошибки, по умолчанию `''`;\n- `submit()` — асинхронная функция:\n  - отправляет `$fetch('/api/orders', { method: 'POST', body: form })`;\n  - при успехе возвращает `true`;\n  - при ошибке кладёт в `error` текст из `e.data.message`, а если его нет — `'Не удалось отправить'`, и возвращает `false`;\n  - перед отправкой очищает прошлую ошибку;\n  - в любом случае в конце сбрасывает `pending`;\n  - если отправка уже идёт, повторный вызов ничего не делает — защита от двойного клика.\n\n`ref`, `computed`, `watch` и остальное доступны без импорта — как при автоимпортах в Nuxt. Функции Nuxt здесь подставные: тест смотрит, как ты их вызвала и что вернула.",
    "starter": "function useOrderForm() {\n  \n}\n",
    "tests": [
      {
        "label": "успех: один запрос POST с данными формы, вернула true",
        "script": "async (fn, sleep, t) => {\n  const f = fn()\n  f.form.email = 'a@b.ru'\n  const ok = await f.submit()\n  const call = t.nuxt.calls.$fetch[0]\n  return [ok, t.nuxt.calls.$fetch.length, call.url, call.options.method, call.options.body.email, f.pending.value]\n}",
        "expected": [
          true,
          1,
          "/api/orders",
          "POST",
          "a@b.ru",
          false
        ]
      },
      {
        "label": "ошибка сервера с текстом → он в error, вернула false",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { throw Object.assign(new Error('422'), { data: { message: 'Неверная почта' } }) }\n  const f = fn()\n  const ok = await f.submit()\n  return [ok, f.error.value, f.pending.value]\n}",
        "expected": [
          false,
          "Неверная почта",
          false
        ]
      },
      {
        "label": "ошибка без текста → запасное сообщение",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { throw new Error('сеть') }\n  const f = fn()\n  await f.submit()\n  return f.error.value\n}",
        "expected": "Не удалось отправить"
      },
      {
        "label": "pending равен true, пока запрос идёт",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { await sleep(50); return {} }\n  const f = fn()\n  const p = f.submit()\n  await sleep(10)\n  const during = f.pending.value\n  await p\n  return [during, f.pending.value]\n}",
        "expected": [
          true,
          false
        ]
      },
      {
        "label": "двойной клик → один запрос",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { await sleep(40); return {} }\n  const f = fn()\n  await Promise.all([f.submit(), f.submit()])\n  return t.nuxt.calls.$fetch.length\n}",
        "expected": 1
      },
      {
        "label": "новая отправка стирает прошлую ошибку",
        "script": "async (fn, sleep, t) => {\n  t.nuxt.fetchImpl = async () => { throw new Error('сеть') }\n  const f = fn()\n  await f.submit()\n  t.nuxt.fetchImpl = async () => ({})\n  await f.submit()\n  return f.error.value\n}",
        "expected": ""
      }
    ],
    "solution": "function useOrderForm() {\n  const form = reactive({ email: '', comment: '' })\n  const pending = ref(false)\n  const error = ref('')\n\n  async function submit() {\n    if (pending.value) return false // уже отправляется\n    pending.value = true\n    error.value = ''\n    try {\n      await $fetch('/api/orders', { method: 'POST', body: form })\n      return true\n    } catch (e) {\n      error.value = e.data?.message ?? 'Не удалось отправить'\n      return false\n    } finally {\n      pending.value = false\n    }\n  }\n\n  return { form, pending, error, submit }\n}"
  },
  {
    "id": "reverse-words",
    "set": "extra",
    "fn": "reverseWords",
    "title": "Перевернуть порядок слов",
    "card": null,
    "statement": "Напиши функцию `reverseWords(str)`: возвращает строку, где слова идут в обратном порядке.\n\n- Слова разделены одним или несколькими пробелами.\n- В результате между словами ровно один пробел, по краям пробелов нет.",
    "starter": "function reverseWords(str) {\n  \n}\n",
    "tests": [
      {
        "args": [
          "привет мир"
        ],
        "expected": "мир привет"
      },
      {
        "args": [
          "  один   два три "
        ],
        "expected": "три два один"
      },
      {
        "args": [
          ""
        ],
        "expected": ""
      },
      {
        "args": [
          "слово"
        ],
        "expected": "слово"
      }
    ],
    "solution": "function reverseWords(str) {\n  return str.trim().split(/\\s+/).reverse().join(' ')\n}"
  },
  {
    "id": "flatten",
    "set": "extra",
    "fn": "flatten",
    "title": "Развернуть вложенный массив",
    "card": "js-044",
    "statement": "Напиши функцию `flatten(arr)`: превращает массив с любой глубиной вложенности в плоский.\n\n- Готовым методом `flat` не пользоваться — смысл в том, чтобы написать обход самой.\n- Пустые вложенные массивы исчезают.",
    "starter": "function flatten(arr) {\n  \n}\n",
    "tests": [
      {
        "args": [
          [
            1,
            [
              2,
              [
                3,
                [
                  4
                ]
              ]
            ],
            5
          ]
        ],
        "expected": [
          1,
          2,
          3,
          4,
          5
        ]
      },
      {
        "args": [
          []
        ],
        "expected": []
      },
      {
        "args": [
          [
            [],
            [
              []
            ]
          ]
        ],
        "expected": []
      },
      {
        "args": [
          [
            "a",
            [
              "b"
            ],
            [
              [
                "c"
              ]
            ]
          ]
        ],
        "expected": [
          "a",
          "b",
          "c"
        ]
      }
    ],
    "solution": "function flatten(arr) {\n  const out = []\n  for (const item of arr) {\n    if (Array.isArray(item)) out.push(...flatten(item))\n    else out.push(item)\n  }\n  return out\n}"
  },
  {
    "id": "promise-all",
    "set": "extra",
    "fn": "promiseAll",
    "title": "Свой Promise.all",
    "card": "js-020",
    "statement": "Напиши функцию `promiseAll(items)` — свою версию `Promise.all`.\n\n- Возвращает промис с массивом результатов **в порядке исходного массива**, а не в порядке завершения.\n- Если хоть один промис отклонён — весь результат отклоняется с этой ошибкой.\n- В массиве могут быть не только промисы, но и обычные значения.\n- Для пустого массива — сразу `[]`.",
    "starter": "function promiseAll(items) {\n  \n}\n",
    "tests": [
      {
        "label": "результаты в исходном порядке, хотя второй завершился раньше",
        "script": "async (fn, sleep) => fn([sleep(60).then(() => 'медленный'), sleep(10).then(() => 'быстрый')])",
        "expected": [
          "медленный",
          "быстрый"
        ]
      },
      {
        "label": "обычные значения вперемешку с промисами",
        "script": "async (fn) => fn([1, Promise.resolve(2), 3])",
        "expected": [
          1,
          2,
          3
        ]
      },
      {
        "label": "пустой массив",
        "script": "async (fn) => fn([])",
        "expected": []
      },
      {
        "label": "одно отклонение отклоняет всё",
        "script": "async (fn, sleep) => {\n  // Пустой обработчик — чтобы отклонение не всплыло необработанным,\n  // если проверяемая функция его проигнорирует\n  const broken = Promise.reject(new Error('сломалось'))\n  broken.catch(() => {})\n  try {\n    const result = await Promise.race([fn([sleep(40).then(() => 1), broken]), sleep(400).then(() => 'не отклонился')])\n    return result === 'не отклонился' ? result : 'не отклонился'\n  } catch (e) {\n    return e.message\n  }\n}",
        "expected": "сломалось"
      }
    ],
    "solution": "function promiseAll(items) {\n  return new Promise((resolve, reject) => {\n    const results = new Array(items.length)\n    let left = items.length\n    if (left === 0) return resolve(results)\n\n    items.forEach((item, i) => {\n      // Promise.resolve превращает в промис и обычное значение\n      Promise.resolve(item).then((value) => {\n        results[i] = value // по индексу, а не push: порядок исходный\n        left -= 1\n        if (left === 0) resolve(results)\n      }, reject)\n    })\n  })\n}"
  }
]
