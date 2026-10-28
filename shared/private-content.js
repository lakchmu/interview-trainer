/**
 * Приватный контент: конспекты 1–8 и всё, что из них сделано (материалы
 * работодателя), личные заметки (14 — вопросы про опыт) и программы под
 * конкретные вакансии.
 *
 * Локальное приложение работает с ними как обычно. В git они не попадают
 * (.gitignore), в демо-сборку — тоже: по этому списку её отсекает
 * scripts/demo-content.mjs. Правило одно на оба места — поменяв здесь,
 * поменяй и .gitignore.
 */
export const PRIVATE_CONTENT = [
  /^notes\/[1-8]\./,
  /^notes\/14\./,
  /^seed\/1[0-7]-kb-/,
  /^quiz\/0[1-8]-kb-/,
  /^selfcheck\/[1-8]\.json$/,
  /^program\/(frontend|ozon)\.json$/,
]

export const isPrivate = (rel) => PRIVATE_CONTENT.some((re) => re.test(rel))
