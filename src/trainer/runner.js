/*
 * Исполнитель задач тренажёра кода. Этот файл целиком загружается в Web Worker
 * как текст (см. Code.tsx), поэтому здесь нет импортов и экспортов.
 *
 * Зачем отдельный поток: код пишет человек, и бесконечный цикл в нём — обычное
 * дело. В основном потоке он повесил бы вкладку, а Worker страница просто
 * останавливает по таймеру.
 *
 * Тест бывает двух видов:
 *   { args: [...], expected }           — вызвать функцию с аргументами;
 *   { script: '(fn, sleep) => ...', expected } — свой сценарий, в том числе
 *     асинхронный: для debounce и промисов одного вызова мало.
 *
 * Режим mode: 'predict' («что выведет код») тестов не запускает: выполняет фрагмент
 * целиком, ждёт его таймеры и возвращает только вывод console.log.
 *
 * Задачи с окружением env: 'vue' получают API Vue и Pinia без импорта — как при
 * автоимпортах в Nuxt. Сами библиотеки настоящие: страница кладёт их сборки в
 * начало этого же файла. Nuxt в браузере не запустить, поэтому его функции
 * (useFetch, useRoute, navigateTo…) здесь — подставные: они записывают, как их
 * вызвали, а тест проверяет именно это.
 */

function show(value, depth) {
  depth = depth || 0
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (typeof value === 'function') return '[функция' + (value.name ? ' ' + value.name : '') + ']'
  if (typeof value === 'symbol') return value.toString()
  if (value instanceof Error) return value.name + ': ' + value.message
  if (value instanceof Promise) return '[Promise]'
  if (depth > 4) return '…'
  if (Array.isArray(value)) return '[' + value.map((v) => show(v, depth + 1)).join(', ') + ']'
  if (value instanceof Set) return 'Set {' + [...value].map((v) => show(v, depth + 1)).join(', ') + '}'
  if (value instanceof Map) {
    return 'Map {' + [...value].map(([k, v]) => show(k, depth + 1) + ' => ' + show(v, depth + 1)).join(', ') + '}'
  }
  const keys = Object.keys(value)
  if (keys.length === 0) return '{}'
  return '{ ' + keys.map((k) => k + ': ' + show(value[k], depth + 1)).join(', ') + ' }'
}

function same(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => same(v, b[i]))
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Подставной Nuxt: каждая функция запоминает свои вызовы в nuxt.calls. */
function makeNuxt(V) {
  const nuxt = {
    calls: {},
    route: V.reactive({ params: {}, query: {}, path: '/', fullPath: '/' }),
    state: new Map(),
    /** Что вернёт useFetch в data; задаёт тест. */
    fetchData: null,
    /** Как ответит $fetch; задаёт тест. */
    fetchImpl: async () => null,
    reset() {
      nuxt.calls = { navigateTo: [], abortNavigation: [], $fetch: [], useFetch: [], useAsyncData: [], createError: [] }
      Object.assign(nuxt.route, { params: {}, query: {}, path: '/', fullPath: '/' })
      nuxt.state = new Map()
      nuxt.fetchData = null
      nuxt.fetchImpl = async () => null
    },
  }
  nuxt.reset()

  // Настоящие useFetch и useAsyncData возвращают объект, который можно и ждать,
  // и разбирать сразу. Промис с теми же полями ведёт себя так же.
  const awaitable = (result) => Object.assign(Promise.resolve(result), result)

  nuxt.api = {
    useRoute: () => nuxt.route,
    useState(key, init) {
      if (!nuxt.state.has(key)) nuxt.state.set(key, V.ref(typeof init === 'function' ? init() : undefined))
      return nuxt.state.get(key)
    },
    navigateTo(to, options) {
      nuxt.calls.navigateTo.push({ to, options })
      return { __navigateTo: true, to, options }
    },
    abortNavigation() {
      nuxt.calls.abortNavigation.push({})
      return { __abortNavigation: true }
    },
    createError(input) {
      const info = typeof input === 'string' ? { statusMessage: input } : input || {}
      nuxt.calls.createError.push(info)
      return Object.assign(new Error(info.statusMessage || info.message || 'Ошибка'), info)
    },
    $fetch(url, options) {
      nuxt.calls.$fetch.push({ url, options })
      return nuxt.fetchImpl(url, options)
    },
    useFetch(url, options) {
      nuxt.calls.useFetch.push({ url, options })
      return awaitable({
        data: V.ref(nuxt.fetchData),
        status: V.ref(nuxt.fetchData == null ? 'error' : 'success'),
        error: V.ref(null),
        refresh: async () => {},
      })
    },
    useAsyncData(key, handler, options) {
      nuxt.calls.useAsyncData.push({ key, options })
      const data = V.ref(null)
      const status = V.ref('pending')
      const done = Promise.resolve()
        .then(handler)
        .then((value) => {
          data.value = value
          status.value = 'success'
        })
      const result = { data, status, error: V.ref(null), refresh: async () => {} }
      return Object.assign(done.then(() => result), result)
    },
    defineNuxtRouteMiddleware: (handler) => handler,
    definePageMeta: () => {},
  }
  return nuxt
}

const VUE_API = [
  'ref', 'computed', 'reactive', 'readonly', 'watch', 'watchEffect', 'nextTick', 'toRef', 'toRefs',
  'unref', 'isRef', 'shallowRef', 'onWatcherCleanup', 'isReactive', 'toRaw', 'markRaw', 'shallowReactive',
]

const REACT_API = [
  'useState', 'useEffect', 'useLayoutEffect', 'useRef', 'useMemo', 'useCallback', 'useReducer',
  'useContext', 'createContext', 'memo', 'forwardRef', 'Fragment', 'useId', 'useTransition',
  'useDeferredValue', 'useSyncExternalStore', 'Component', 'PureComponent', 'StrictMode',
]
const REACT_HELPERS = ['render', 'renderHook', 'click', 'type', 'check', 'submit', 'keyDown', 'wait', 'act']

/**
 * Предупреждения React (нет key, setState после размонтирования…) — в вывод под
 * тестами: это ровно то, что на интервью увидели бы в консоли. React передаёт их
 * строкой формата с %s; стек компонентов отрезаем, он здесь бесполезен.
 */
function reactWarning(args) {
  let rest = args.slice(1)
  let text = typeof args[0] === 'string' ? args[0].replace(/%[sdo]/g, () => String(rest.length ? rest.shift() : '')) : show(args[0])
  text = text
    .split('\n')
    .filter((line) => !/^\s+at /.test(line))
    .join('\n')
    .trim()
  return text.length > 400 ? text.slice(0, 400) + '…' : text
}

/** Сколько ждать таймеры кода «что выведет» после его последней строки. */
const PREDICT_SETTLE_MS = 300

self.onmessage = async (event) => {
  const { source, name, tests, env, mode } = event.data
  const logs = []

  // Что видно коду человека без импорта
  const scope = {}
  let nuxt = null
  let tools = {}
  if (env === 'vue') {
    for (const key of VUE_API) scope[key] = Vue[key]
    scope.defineStore = Pinia.defineStore
    scope.storeToRefs = Pinia.storeToRefs
    nuxt = makeNuxt(Vue)
    Object.assign(scope, nuxt.api)
    tools = Object.assign({}, scope, { nuxt })
  }
  if (env === 'react') {
    // Хуки доступны и без импорта, и с ним: import { useState } from 'react'
    // превращается в require('react'), а require знает только react
    const R = ReactEnv.React
    scope.React = R
    for (const key of REACT_API) scope[key] = R[key]
    scope.require = (id) => {
      if (id === 'react') return R
      throw new Error('Модуль «' + id + '» здесь недоступен: есть только react')
    }
    const helpers = {}
    for (const key of REACT_HELPERS) helpers[key] = ReactEnv[key]
    // В «что выведет» фрагмент сам рендерит и кликает — помощники ему нужны в области видимости
    if (mode === 'predict') Object.assign(scope, helpers)
    tools = Object.assign({}, scope, helpers, { h: R.createElement })
  }
  const names = Object.keys(scope)
  const original = console.log
  const originalError = console.error
  console.log = (...args) => {
    if (logs.length < 200) logs.push(args.map((a) => (typeof a === 'string' ? a : show(a))).join(' '))
  }
  if (env === 'react') {
    console.error = (...args) => {
      const text = reactWarning(args)
      if (/react-test-renderer is deprecated/.test(text)) return
      if (logs.length < 200) logs.push('⚠ ' + text)
    }
  }
  const restore = () => {
    console.log = original
    console.error = originalError
  }

  // «Что выведет код»: функции нет, есть фрагмент. Выполняем его целиком, как
  // тело async-функции (так в нём работает await), ждём таймеры и отдаём вывод.
  if (mode === 'predict') {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const code = env === 'react' ? ReactEnv.compile(source, { modules: false }) : source
      await new AsyncFunction(...names, code)(...names.map((k) => scope[k]))
    } catch (err) {
      logs.push('Uncaught ' + (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)))
    }
    await sleep(PREDICT_SETTLE_MS)
    restore()
    self.postMessage({ logs })
    return
  }

  let fn
  try {
    // Код человека выполняется как тело функции: так объявление видно снаружи
    // по имени, а его переменные не утекают в область исполнителя.
    // «export default …» в теле функции невозможен — превращаем его в присваивание
    if (env === 'react') {
      // JSX и TypeScript — через транспилятор; import/export он превращает в
      // require и exports, поэтому export default и именованный экспорт работают
      const body = ReactEnv.compile(source)
      const wanted =
        name === 'default' ? 'exports.default' : 'typeof ' + name + ' === "function" ? ' + name + ' : exports.' + name
      const exports = {}
      fn = new Function(...names, 'exports', 'module', body + '\n;return ' + wanted)(
        ...names.map((k) => scope[k]),
        exports,
        { exports },
      )
    } else {
      const body = source.replace(/^\s*export\s+default\s+/m, '__default = ')
      const wanted = name === 'default' ? '__default' : 'typeof ' + name + ' === "function" ? ' + name + ' : undefined'
      fn = new Function(...names, 'let __default;\n' + body + '\n;return ' + wanted)(...names.map((k) => scope[k]))
    }
  } catch (err) {
    restore()
    self.postMessage({ fatal: (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)), logs })
    return
  }
  if (typeof fn !== 'function') {
    restore()
    const missing =
      name === 'default'
        ? 'Не найден «export default». Файл должен экспортировать функцию по умолчанию.'
        : 'Функция ' + name + ' не найдена. Она должна называться именно так.'
    self.postMessage({ fatal: missing, logs })
    return
  }

  const results = []
  for (const test of tests) {
    try {
      // У каждого теста свои сторы и свой «Nuxt»: тесты не должны видеть следы друг друга
      if (env === 'vue') {
        Pinia.setActivePinia(Pinia.createPinia())
        nuxt.reset()
      }
      let actual
      if (test.script) {
        const scenario = new Function('return (' + test.script + ')')()
        actual = await scenario(fn, sleep, tools)
      } else {
        // Копия аргументов: тест не должен зависеть от того, испортил ли их предыдущий
        actual = await fn(...structuredClone(test.args))
      }
      results.push({ ok: same(actual, test.expected), actual: show(actual), expected: show(test.expected) })
    } catch (err) {
      results.push({
        ok: false,
        error: (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)),
        expected: show(test.expected),
      })
    }
  }
  restore()
  self.postMessage({ results, logs })
}
