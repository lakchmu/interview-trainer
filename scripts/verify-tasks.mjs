// Проверка задач тренажёра кода: эталонное решение каждой задачи прогоняется
// через тот же runner.js и те же сборки Vue, Pinia и React, что и в браузере.
// Для «что выведет код» сверяется настоящий вывод фрагмента с записанным.
//
//   node --experimental-strip-types scripts/verify-tasks.mjs          — все задачи
//   node --experimental-strip-types scripts/verify-tasks.mjs react    — набор или префикс id
//
// Пустая заготовка тоже прогоняется: если она проходит тесты, тесты слабые.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const runner = read('src/trainer/runner.js')
const vue = read('node_modules/vue/dist/vue.runtime.global.prod.js')
const pinia = read('node_modules/pinia/dist/pinia.iife.prod.js')
const reactEnv = read('src/trainer/vendor/react-env.js')

/** Тот же Worker, только в отдельном контексте vm. */
export function run(message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('не завершился за 4 секунды')), 4000)
    const context = vm.createContext({
      self: {
        postMessage(data) {
          clearTimeout(timer)
          resolve(data)
        },
      },
      console: { log() {}, error() {}, warn() {} },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      queueMicrotask,
      structuredClone,
      MessageChannel,
      AbortController,
      AbortSignal,
      URL,
      URLSearchParams,
      Date,
      performance,
      TextEncoder,
      TextDecoder,
    })
    context.globalThis = context
    const prefix = message.env === 'vue' ? `${vue}\n;${pinia}\n;` : message.env === 'react' ? `${reactEnv}\n;` : ''
    vm.runInContext(prefix + runner, context)
    context.self.onmessage({ data: message })
  })
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  // Необработанное отклонение в чужом коде не должно ронять проверку
  process.on('unhandledRejection', () => {})
  const { CODE_TASKS } = await import(path.join(ROOT, 'src/trainer/tasks.ts'))
  const only = process.argv[2]
  let bad = 0
  for (const t of CODE_TASKS) {
    if (only && t.set !== only && !t.id.startsWith(only)) continue
    if (t.kind === 'predict') {
      const res = await run({ source: t.code, mode: 'predict', env: t.env })
      if (JSON.stringify(res.logs) === JSON.stringify(t.output)) console.log('✓', t.id)
      else {
        bad++
        console.log('✕', t.id, '\n   вывод   ', JSON.stringify(res.logs), '\n   записано', JSON.stringify(t.output))
      }
      continue
    }
    const res = await run({ source: t.solution, name: t.fn, tests: t.tests, env: t.env })
    if (res.fatal) {
      bad++
      console.log('✕', t.id, 'не запустился:', res.fatal)
      continue
    }
    const fails = res.results.map((r, i) => [r, i]).filter(([r]) => !r.ok)
    if (fails.length) {
      bad++
      console.log('✕', t.id)
      for (const [r, i] of fails) console.log('   ', t.tests[i].label ?? i, r)
    } else console.log('✓', t.id, res.results.length, 'тестов')
    const warnings = res.logs.filter((l) => l.startsWith('⚠'))
    if (warnings.length) console.log('   ⚠ эталон вызывает предупреждения React:', warnings)

    const empty = await run({ source: t.starter, name: t.fn, tests: t.tests, env: t.env }).catch((e) => ({ fatal: e.message }))
    const passed = empty.results?.filter((r) => r.ok).length ?? 0
    if (passed) console.log(`   заготовка проходит ${passed} из ${t.tests.length}`)
  }
  console.log(bad ? `ПРОВАЛЕНО: ${bad}` : 'всё зелёное')
  process.exit(bad ? 1 : 0)
}
