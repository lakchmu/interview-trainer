/**
 * node:url для демо-сборки. Серверные модули вычисляют свою папку как
 * dirname(fileURLToPath(import.meta.url)) и от неё — корень проекта. В браузере
 * все они живут в одной виртуальной папке /app/server, отсюда и ответ.
 */
export const fileURLToPath = (_url: string | URL) => '/app/server/module.mjs'

export default { fileURLToPath }
