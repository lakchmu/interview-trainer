/**
 * Маршруты API без привязки к транспорту.
 *
 * Обработчики пишутся в стиле Express — `(req, res) => res.json(...)` — и
 * регистрируются здесь, а не в самом Express. Локально их подключает
 * Express (server/index.mjs), в демо-сборке тот же код вызывается прямо
 * в браузере (src/demo/backend.ts). Поэтому обработчикам доступны только
 * req.body, req.query, req.params и res.status(n).json(body).
 */
export function createRouter() {
  const routes = []
  const add = (method) => (path, handler) => {
    routes.push({ method, path, handler, pattern: compile(path) })
  }

  return {
    routes,
    get: add('GET'),
    post: add('POST'),
    put: add('PUT'),
    delete: add('DELETE'),

    /**
     * Выполнить запрос без HTTP. Возвращает { status, body } — как ответ
     * сервера, включая 404 на неизвестный маршрут и 500 на исключение.
     */
    handle(method, pathname, { query = {}, body } = {}) {
      for (const route of routes) {
        if (route.method !== method) continue
        const match = route.pattern.exec(pathname)
        if (!match) continue
        const params = Object.fromEntries(
          Object.entries(match.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]),
        )
        const reply = { status: 200, body: undefined }
        const res = {
          status(code) {
            reply.status = code
            return res
          },
          json(value) {
            // Как в Express: тело уходит сериализованным, поэтому вызывающий
            // не получит ссылку на живой объект базы
            reply.body = value === undefined ? undefined : JSON.parse(JSON.stringify(value))
            return res
          },
        }
        try {
          route.handler({ body: body ?? {}, query, params }, res)
        } catch (err) {
          return { status: 500, body: { error: err.message } }
        }
        return reply
      }
      return { status: 404, body: { error: `Нет маршрута ${method} ${pathname}` } }
    },
  }
}

/** '/api/cards/:id/suspend' → /^\/api\/cards\/(?<id>[^/]+)\/suspend$/ */
function compile(path) {
  const source = path
    .split('/')
    .map((part) => (part.startsWith(':') ? `(?<${part.slice(1)}>[^/]+)` : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('\\/')
  return new RegExp(`^${source}$`)
}
