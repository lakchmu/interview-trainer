import { StrictMode, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { applyTheme, loadSettings, resolve } from './theme'
import './styles.css'

/** Общий запуск для обычной и демо-сборки (main.tsx и main.demo.tsx). */
export function createAppRoot() {
  // Тема ставится до первого рендера, иначе на долю секунды мелькнёт чужая палитра
  const settings = loadSettings()
  applyTheme(resolve(settings), settings.scenery)

  const root = createRoot(document.getElementById('root')!)
  return {
    root,
    renderApp(props: ComponentProps<typeof App> = {}) {
      root.render(
        <StrictMode>
          <HashRouter>
            <App {...props} />
          </HashRouter>
        </StrictMode>,
      )
    },
  }
}
