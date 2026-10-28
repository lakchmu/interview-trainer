import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { getDb, flushOnExit, ROOT } from './db.mjs'
import { app as api, reconcileReadingMarks } from './api.mjs'

// Отдельная переменная, а не PORT: под некоторыми обёртками PORT занят фронтендом.
const PORT = Number(process.env.API_PORT ?? 5174)
const app = express()
app.use(express.json({ limit: '4mb' }))

// Маршруты описаны без Express (server/api.mjs) — здесь они только подключаются
for (const route of api.routes) app[route.method.toLowerCase()](route.path, route.handler)

// ---------------------------------------------------------------- статика

const dist = path.join(ROOT, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

getDb()
flushOnExit()

const server = app.listen(PORT, () => {
  console.log(`API готов: http://localhost:${PORT}`)
  if (fs.existsSync(dist)) console.log(`Приложение: http://localhost:${PORT}`)
  // Только ПОСЛЕ успешного захвата порта: если порт занят, базой владеет живой
  // процесс, и запись из умирающего дубля затёрла бы его состояние.
  reconcileReadingMarks(getDb())
})

// Молча занятый порт — источник долгой отладки: интерфейс работает,
// но разговаривает со старым сервером, где нет свежих маршрутов.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n✗ Порт ${PORT} уже занят.\n` +
        '  Скорее всего запущено приложение «Interview Trainer» из дока — завершите его,\n' +
        `  либо освободите порт: kill $(lsof -ti:${PORT})\n`,
    )
    // Базой владеет тот процесс, что занял порт. Выходим, ничего не записав.
    process.exit(1)
  }
  throw err
})
