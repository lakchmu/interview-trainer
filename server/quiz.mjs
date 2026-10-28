import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './db.mjs'

const QUIZ_DIR = path.join(ROOT, 'data', 'quiz')

/**
 * Мини-тесты с вариантами ответов: data/quiz/*.json, по файлу на раздел.
 * Читаются при каждом запросе — файлы маленькие, зато правки видны без рестарта.
 */
export function readQuizzes() {
  if (!fs.existsSync(QUIZ_DIR)) return []
  const bundles = []

  for (const file of fs.readdirSync(QUIZ_DIR).filter((f) => f.endsWith('.json')).sort()) {
    let bundle
    try {
      bundle = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, file), 'utf8'))
    } catch (err) {
      console.error(`[quiz] пропускаю ${file}: ${err.message}`)
      continue
    }

    const questions = (bundle.questions ?? []).map((q) => ({
      id: q.id,
      kind: q.kind ?? 'single',
      question: q.q,
      options: q.options ?? [],
      why: q.why ?? '',
      card: q.card ?? null,
      topic: bundle.topic,
    }))

    if (questions.length) {
      bundles.push({ topic: bundle.topic, title: bundle.title, questions })
    }
  }
  return bundles
}
