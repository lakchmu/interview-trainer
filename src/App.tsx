import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api'
import type { Card, Config, Decor, GameResponse, Program as ProgramData, Reward, Stats } from './types'
import { Sky } from './components/Sky'
import { SkyPicker } from './components/SkyPicker'
import { applyTheme, loadSettings, resolve, saveSettings } from './theme'
import type { Phase, SkySettings, Weather } from './theme'
import { Dashboard } from './pages/Dashboard'
import { Program } from './pages/Program'
import { Interview } from './pages/Interview'
import { Quiz } from './pages/Quiz'
import { Ascent } from './pages/Ascent'
import { Rewards } from './components/Rewards'
import { GameBadge } from './components/GameBadge'
import { NavIcon } from './components/NavIcon'
import { Review } from './pages/Review'
import { Browse } from './pages/Browse'
import { Notes } from './pages/Notes'
import { Settings } from './pages/Settings'
import { Shop } from './pages/Shop'
import { Code } from './pages/Code'

export interface AppData {
  cards: Card[]
  config: Config
  reload: () => Promise<void>
  toast: (message: string) => void
  /** Показать награду за действие: опыт, уровень, достижения. */
  celebrate: (reward: Reward | undefined) => void
  game: GameResponse | null
  /** Программа подготовки под компанию: список тем и готовность по каждой. */
  program: ProgramData | null
  /** Текущая сцена — чтобы страницы могли показать её врезкой. */
  scene: { phase: Phase; weather: Weather; hour: number; scenery: boolean; decor: Decor; trail: number }
}

/**
 * Доля прочитанного текста. В фокусе на программе конспекты вне её в расчёт не
 * идут: иначе два больших файла про React навсегда держали бы шкалу внизу.
 */
function readPercent(g: GameResponse, program: ProgramData | null) {
  const files = program?.focus ? g.reading.files.filter((f) => program.fileScope[f.rel] !== 'out') : g.reading.files
  const total = files.reduce((s, f) => s + f.charsTotal, 0)
  return total ? (files.reduce((s, f) => s + f.charsRead, 0) / total) * 100 : 0
}

/** «<1%» вместо «0%»: округлять начатое чтение в ноль — неправда и уныние. */
function label(p: number) {
  if (p > 0 && p < 1) return '<1%'
  return `${Math.round(p)}%`
}

/**
 * banner — полоса над страницей (демо-сборка кладёт сюда свою плашку);
 * onNavigate — переход между разделами, кроме самого первого.
 */
export function App({ banner, onNavigate }: { banner?: ReactNode; onNavigate?: (path: string) => void } = {}) {
  const [cards, setCards] = useState<Card[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [daily, setDaily] = useState<Stats['daily']>({})
  const [game, setGame] = useState<GameResponse | null>(null)
  const [program, setProgram] = useState<ProgramData | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sky, setSky] = useState<SkySettings>(loadSettings)
  const [now, setNow] = useState(() => new Date())
  // На узком экране меню свёрнуто: иначе оно занимает половину первого экрана
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const firstPage = useRef(true)
  useEffect(() => {
    setMenuOpen(false)
    if (firstPage.current) firstPage.current = false
    else onNavigate?.(location.pathname)
  }, [location.pathname, onNavigate])

  // В авторежиме фаза должна меняться сама, пока вкладка открыта
  useEffect(() => {
    if (sky.mode !== 'auto' && sky.weather !== 'auto') return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [sky.mode, sky.weather])

  const resolved = useMemo(() => resolve(sky, now), [sky, now])

  useEffect(() => {
    applyTheme(resolved, sky.scenery)
  }, [resolved, sky.scenery])

  const changeSky = useCallback((next: SkySettings) => {
    setSky(next)
    saveSettings(next)
    setNow(new Date())
  }, [])

  const reload = useCallback(async () => {
    try {
      const state = await api.state()
      setCards(state.cards)
      setConfig(state.config)
      setDaily(state.daily)
      setGame(await api.game())
      setProgram(await api.program())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const celebrate = useCallback((next: Reward | undefined) => {
    if (!next) return
    setReward(next)
    // Опыт начислен — значит состояние игры изменилось. Обновляем его здесь,
    // а не в каждом вызывающем месте: иначе бейдж в сайдбаре отстаёт везде,
    // где кто-то забыл дёрнуть reload (так и было с отметкой «прочитано»).
    void api.game().then(setGame).catch(() => {})
    // Готовность по программе складывается из тех же действий
    void api.program().then(setProgram).catch(() => {})
  }, [])

  const toast = useCallback((text: string) => {
    setMessage(text)
    const id = setTimeout(() => setMessage(null), 2600)
    return () => clearTimeout(id)
  }, [])

  /** Ровно то, что попадёт в очередь сегодня: просроченное + новые в пределах лимита. */
  const todayCount = useMemo(() => {
    if (!config) return 0
    const now = Date.now()
    // В фокусе очередь собирается без карточек вне программы — считаем так же
    const active = cards.filter((c) => !c.suspended && !(program?.focus && c.scope === 'out'))
    const due = active.filter((c) => c.srs.due !== null && new Date(c.srs.due).getTime() <= now).length
    const doneNew = daily[new Date().toISOString().slice(0, 10)]?.new ?? 0
    const fresh = active.filter((c) => c.srs.state === 'new').length
    return due + Math.min(fresh, Math.max(0, config.newPerDay - doneNew))
  }, [cards, config, daily, program?.focus])

  if (error) {
    return (
      <div className="main">
        <div className="empty">
          <h3>Сервер не отвечает</h3>
          <p>{error}</p>
          <p className="hint">
            Запусти <code>npm run dev</code> — должны подняться и API (порт 5174), и Vite (5173).
          </p>
        </div>
      </div>
    )
  }

  if (!config) return <div className="main subtitle">Загрузка…</div>

  // Пока ничего не куплено — сцена ровно такая же, как была до магазина.
  const decor = game?.decor ?? { items: [], collar: null }
  // Доля разведанного конспекта — она же длина тропы на хребте.
  const trail = game && game.reading.total > 0 ? game.reading.read / game.reading.total : 0
  const scene = { ...resolved, scenery: sky.scenery, decor, trail }
  const data: AppData = { cards, config, reload, toast, celebrate, game, program, scene }
  const read = game ? readPercent(game, program) : 0
  const asked = cards.filter((c) => c.asked).length

  return (
    <div className="app">
      <Sky
        phase={resolved.phase}
        weather={resolved.weather}
        hour={resolved.hour}
        scenery={sky.scenery}
        decor={decor}
        trail={trail}
      />
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>
            Interview Trainer
            {program && <small>{program.brand}</small>}
          </span>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Закрыть' : 'Меню'}
        </button>

        <nav id="main-nav" className={`nav ${menuOpen ? 'open' : ''}`} aria-label="Разделы">
          {program && (
            <NavLink to="/" end className="nav-link nav-program">
              <NavIcon name="program" />
              <span>{program.nav}</span>
              <span className={`pill ${program.readiness >= 1 ? 'notes' : 'accent'}`}>{label(program.readiness * 100)}</span>
            </NavLink>
          )}

          {/*
            Порядок — по тому, сколько времени страница реально забирает.
            Сверху ежедневная работа, ниже — то, куда заходят посмотреть, в самом
            низу редкое. Обзор ушёл из первой строки не потому, что не нужен: он
            и так открывается при запуске, а переходят на него редко.
          */}
          <NavLink to="/notes" className={`nav-link ${program ? 'group-start' : ''}`}>
            <NavIcon name="notes" />
            <span>Конспекты</span>
            {game && game.reading.charsTotal > 0 && (
              <span className={`pill ${read >= 100 ? 'notes' : 'ghost'}`}>
                {/* Доля прочитанного текста, а не карточек: карточки различаются
                    в десятки раз, и их доля не равна доле пройденного материала */}
                {label(read)}
              </span>
            )}
          </NavLink>
          <NavLink to="/review" className="nav-link">
            <NavIcon name="review" />
            <span>Повторение</span>
            {todayCount > 0 && <span className="pill accent">{todayCount}</span>}
          </NavLink>
          <NavLink to="/quiz" className="nav-link">
            <NavIcon name="quiz" />
            <span>Мини-тесты</span>
          </NavLink>
          <NavLink to="/code" className="nav-link">
            <NavIcon name="code" />
            <span>Код руками</span>
          </NavLink>
          {/* Раздел живёт на дословных репликах интервьюеров — без них ему нечего показать */}
          {asked > 0 && (
            <NavLink to="/interview" className="nav-link">
              <NavIcon name="interview" />
              <span>Вопросы ревьюера</span>
              <span className="pill ghost">{asked}</span>
            </NavLink>
          )}

          <NavLink to={program ? '/overview' : '/'} end className="nav-link group-start">
            <NavIcon name="dashboard" />
            <span>Обзор</span>
          </NavLink>
          <NavLink to="/ascent" className="nav-link">
            <NavIcon name="ascent" />
            <span>Восхождение</span>
            {game && <span className="pill accent">ур. {game.level.level}</span>}
          </NavLink>
          <NavLink to="/shop" className="nav-link">
            <NavIcon name="shop" />
            <span>Магазин</span>
            {game && game.game.mana > 0 && <span className="pill mana">{game.game.mana}</span>}
          </NavLink>

          <NavLink to="/cards" className="nav-link group-start">
            <NavIcon name="cards" />
            <span>Карточки</span>
            <span className="pill ghost">{cards.length}</span>
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            <NavIcon name="settings" />
            <span>Настройки</span>
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          {game && <GameBadge game={game} />}
          <div className="legend">
            <span className="pill gen">сгенерировано</span>
            <span className="pill notes">из конспектов</span>
            <span className="pill manual">свои</span>
          </div>
          <SkyPicker settings={sky} resolved={resolved} onChange={changeSky} />
        </div>
      </aside>

      <main className="main">
        {banner}
        <Routes>
          {/* Есть программа — приложение открывается на плане, обзор уходит на свой адрес */}
          <Route path="/" element={program ? <Program data={data} /> : <Dashboard data={data} />} />
          <Route path="/overview" element={<Dashboard data={data} />} />
          <Route path="/review" element={<Review data={data} />} />
          <Route path="/interview" element={<Interview data={data} />} />
          <Route path="/quiz" element={<Quiz data={data} />} />
          <Route path="/code" element={<Code data={data} />} />
          <Route path="/ascent" element={<Ascent data={data} />} />
          <Route path="/cards" element={<Browse data={data} />} />
          <Route path="/notes" element={<Notes data={data} />} />
          <Route path="/shop" element={<Shop data={data} />} />
          <Route path="/settings" element={<Settings data={data} />} />
        </Routes>
      </main>

      {message && <div className="toast">{message}</div>}
      <Rewards reward={reward} />
    </div>
  )
}
