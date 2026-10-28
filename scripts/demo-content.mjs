/**
 * Снимок публичного контента для демо-сборки: data/notes, seed, quiz,
 * selfcheck и program одним JSON. Демо монтирует его в виртуальную файловую
 * систему, и серверный код читает его так же, как файлы на диске.
 *
 * Берётся только то, что разрешено: папки — по белому списку, внутри них
 * приватное отсекается по shared/private-content.js. Личная база, её копии
 * и всё прочее из data/ сюда не попадают никогда.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPrivate } from '../shared/private-content.js'

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const FOLDERS = { notes: /\.md$/, seed: /\.json$/, quiz: /\.json$/, selfcheck: /\.json$/, program: /\.json$/ }

export function buildDemoContent() {
  const files = {}
  for (const [folder, ext] of Object.entries(FOLDERS)) {
    const dir = path.join(DATA, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir).sort()) {
      const rel = `${folder}/${name}`
      if (!ext.test(name) || isPrivate(rel)) continue
      files[rel] = fs.readFileSync(path.join(dir, name), 'utf8')
    }
  }
  if (!files['program/demo.json']) throw new Error('[demo] нет data/program/demo.json')
  // Вторая линия защиты: даже если правило выше сломают, приватные колоды
  // узнаются по содержимому — тогда сборка падает, а не публикует их
  for (const [rel, text] of Object.entries(files)) {
    if (/"topic":\s*"kb-/.test(text)) throw new Error(`[demo] в публичный файл попала приватная колода: ${rel}`)
  }
  return { builtAt: Date.now(), files }
}
