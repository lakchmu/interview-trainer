/**
 * Точка входа демо-сборки (`vite build --mode demo` подставляет её в index.html).
 * Сервера нет: API работает в браузере, поэтому сначала загружаются контент и
 * прогресс, и только потом рисуется приложение.
 */
import { setTransport } from './api'
import { createAppRoot } from './mount'
import { demoFetch, startDemo } from './demo/backend'
import { DemoBar } from './demo/DemoBar'
import { startMetrika, trackPage } from './demo/metrika'

const { root, renderApp } = createAppRoot()
root.render(<div className="demo-boot">Загружаю демо…</div>)

startMetrika()
setTransport(demoFetch)
startDemo()
  .then(() => renderApp({ banner: <DemoBar />, onNavigate: trackPage }))
  .catch((err: Error) => {
    root.render(
      <div className="demo-boot" role="alert">
        Не удалось запустить демо: {err.message}. Обновите страницу.
      </div>,
    )
  })
