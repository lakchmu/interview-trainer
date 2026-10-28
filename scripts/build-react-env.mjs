// Собирает окружение задач на React для тренажёра кода в один файл.
// Запускать после обновления react, react-test-renderer или sucrase:
//   node scripts/build-react-env.mjs
import { build } from 'esbuild'

await build({
  entryPoints: ['src/trainer/react-env.entry.js'],
  outfile: 'src/trainer/vendor/react-env.js',
  bundle: true,
  format: 'iife',
  globalName: 'ReactEnv',
  // Разработческая сборка React: с ней видны предупреждения о key и хуках
  // global — из Node: тестовый рендерер обращается к нему, а в Worker его нет
  define: { 'process.env.NODE_ENV': '"development"', global: 'globalThis' },
  minify: true,
  legalComments: 'none',
  banner: { js: '/* Сгенерировано scripts/build-react-env.mjs — не править руками */' },
  logLevel: 'warning',
})
