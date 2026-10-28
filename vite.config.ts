import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { buildDemoContent } from './scripts/demo-content.mjs'

/*
 * Порты берутся из переменных, чтобы рядом с основным экземпляром можно было
 * поднять второй — для правок, пока на основном идёт работа с материалом.
 * Второй обязан ходить в СВОЙ api и свою базу: две копии сервера на одной
 * базе перезапишут друг друга, каждая держит её в памяти.
 */
const apiPort = Number(process.env.API_PORT ?? 5174)
const webPort = Number(process.env.WEB_PORT ?? 5173)

const local = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/** Публичный контент для демо: в dev отдаётся на лету, в сборке — файлом. */
function demoContent(): Plugin {
  const FILE = 'demo-content.json'
  return {
    name: 'demo-content',
    configureServer(server) {
      server.middlewares.use(`/${FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(buildDemoContent()))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: FILE, source: JSON.stringify(buildDemoContent()) })
    },
    // Своя точка входа: обычная сборка о демо-коде не знает вовсе
    transformIndexHtml: {
      order: 'pre', // до того, как Vite разберёт скрипты страницы
      handler: (html) => html.replace('/src/main.tsx', '/src/main.demo.tsx'),
    },
  }
}

export default defineConfig(({ mode }) => {
  /*
   * Демо-сборка (`--mode demo`) — статический сайт без сервера: маршруты
   * server/api.mjs работают в браузере, node:* подменены (src/demo).
   * BASE — путь сайта на хостинге, например /interview-trainer/ на GitHub Pages.
   */
  const demo = mode === 'demo'
  return {
    base: demo ? (process.env.BASE ?? '/') : '/',
    plugins: [react(), ...(demo ? [demoContent()] : [])],
    resolve: demo
      ? {
          alias: {
            'node:fs': local('./src/demo/node-fs.ts'),
            'node:path': local('./src/demo/node-path.ts'),
            'node:url': local('./src/demo/node-url.ts'),
          },
        }
      : {},
    server: {
      port: webPort,
      strictPort: true,
      // Браузер открывает только основной экземпляр — иначе правки лезли бы в глаза
      open: !process.env.WEB_PORT && !demo,
      proxy: demo ? undefined : { '/api': `http://localhost:${apiPort}` },
    },
    build: { outDir: demo ? 'dist-demo' : 'dist' },
  }
})
