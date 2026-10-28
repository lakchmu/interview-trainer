/**
 * Проверка демо-сборки перед публикацией: в dist-demo не должно быть ни строчки
 * приватного контента (shared/private-content.js).
 *
 * Приватные файлы есть только на машине автора — по ним и сверяемся: из каждого
 * берутся вопросы карточек и тестов, заголовки разделов, и ни один не должен
 * встретиться в собранных файлах. Где приватных файлов нет (чистый клон),
 * проверка сводится к поиску абсолютных путей.
 *
 *   node scripts/check-demo.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPrivate } from '../shared/private-content.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist-demo')
const DATA = path.join(ROOT, 'data')

if (!fs.existsSync(DIST)) {
  console.error('✗ Нет dist-demo — сначала npm run build:demo')
  process.exit(1)
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full) : [full]
  })

// Отпечатки приватного контента: строки, которых нет нигде, кроме него. Короче
// 32 символов не берём — такие фразы («CORS — не защита сервера») встречаются
// и в публичных конспектах сами по себе
const needles = new Set()
for (const folder of ['notes', 'seed', 'quiz', 'selfcheck', 'program']) {
  const dir = path.join(DATA, folder)
  if (!fs.existsSync(dir)) continue
  for (const name of fs.readdirSync(dir)) {
    if (!isPrivate(`${folder}/${name}`)) continue
    const text = fs.readFileSync(path.join(dir, name), 'utf8')
    if (name.endsWith('.md')) {
      for (const m of text.matchAll(/^#{2,3} (.{32,})$/gm)) needles.add(m[1].trim())
    } else {
      const json = JSON.parse(text)
      for (const item of [...(json.cards ?? []), ...(json.questions ?? []), ...(json.checks ?? [])]) {
        if (typeof item.q === 'string' && item.q.length >= 32) needles.add(item.q)
      }
      if (typeof json.title === 'string' && json.title.length >= 32) needles.add(json.title)
    }
  }
}

const problems = []
for (const file of walk(DIST)) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  if (/\/Users\/[^/"'\s]+\//.test(text)) problems.push(`${rel}: абсолютный путь с именем пользователя`)
  for (const needle of needles) {
    // В JSON-снимке строки экранированы — сверяем и так, и так
    if (text.includes(needle) || text.includes(JSON.stringify(needle).slice(1, -1))) {
      problems.push(`${rel}: «${needle.slice(0, 70)}»`)
    }
  }
}

if (problems.length) {
  console.error(`✗ В демо-сборке приватный контент (${problems.length}):`)
  for (const p of problems.slice(0, 20)) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`✓ Демо-сборка чистая: сверено с ${needles.size} отпечатками приватного контента`)
