import { useEffect, useMemo, useRef, useState } from 'react'
import { PHASES, celestial } from '../theme'
import type { Phase, Weather } from '../theme'
import { Aurora, RidgeDecor } from './Decor'
import type { Decor } from '../types'

interface Props {
  phase: Phase
  weather: Weather
  hour: number
  scenery: boolean
  /** Купленные и включённые украшения. Пока ничего не куплено — сцена как была. */
  decor: Decor
  /** Доля разведанных разделов конспекта — рисуется тропой по хребту. */
  trail: number
  /**
   * Врезка вместо фона. Нужна потому, что склон приходится на самый низ окна и
   * почти всегда закрыт контентом — купленную живность иначе просто не видно.
   */
  framed?: boolean
}

/** Уважаем системную настройку: при «меньше движения» зверьё стоит на месте. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Звёзды раскиданы один раз за сессию — иначе они бы «прыгали» на каждом рендере. */
function useStars(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        // верхние две трети неба — ниже начинаются горы
        top: Math.random() * 62,
        size: Math.random() < 0.15 ? 2.4 : Math.random() * 1.2 + 0.8,
        delay: Math.random() * 4,
        dim: 0.35 + Math.random() * 0.65,
      })),
    [count],
  )
}

export function Sky({ phase, weather, hour, scenery, decor, trail, framed = false }: Props) {
  const stars = useStars(80)
  const sun = celestial(hour)
  const reduced = useReducedMotion()

  return (
    <div className={framed ? 'sky framed' : 'sky'} aria-hidden="true">
      {PHASES.map((p) => (
        <div key={p.id} className="sky-layer" data-phase={p.id} style={{ opacity: p.id === phase ? 1 : 0 }} />
      ))}

      {scenery && (
        <>
          <div className="stars">
            {stars.map((s) => (
              <i
                key={s.id}
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  opacity: s.dim,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          <div
            className="celestial"
            data-body={sun.body}
            style={{ left: `${sun.x}%`, top: `${sun.y}%` }}
          />

          {decor.items.includes('aurora') && <Aurora phase={phase} />}
          <div className="haze" />
          <Ridges decor={decor} reduced={reduced} trail={trail} />
          <Precipitation weather={weather} phase={phase} />
        </>
      )}
    </div>
  )
}

function Ridges({ decor, reduced, trail }: { decor: Decor; reduced: boolean; trail: number }) {
  return (
    <svg className="ridges" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
      <path
        className="ridge-far"
        d="M0,286 L88,232 L152,258 L244,146 L318,214 L372,190 L446,256 L534,168 L602,222 L706,118 L790,208 L858,246 L930,196 L1012,258 L1104,152 L1188,228 L1266,200 L1348,262 L1440,178 L1440,400 L0,400 Z"
      />
      <path
        className="ridge-mid"
        d="M0,330 L136,268 L262,318 L406,246 L482,288 L604,232 L742,312 L846,272 L978,320 L1116,254 L1252,306 L1372,268 L1440,292 L1440,400 L0,400 Z"
      />
      <path
        className="ridge-near"
        d="M0,356 C142,318 246,384 392,360 C520,339 616,388 742,368 C880,346 962,392 1104,370 C1236,350 1320,390 1440,364 L1440,400 L0,400 Z"
      />
      <RidgeDecor decor={decor} reduced={reduced} trail={trail} />
    </svg>
  )
}

/**
 * Осадки на canvas: сотня частиц в DOM стоила бы куда дороже, а тут вся отрисовка —
 * один слой. При prefers-reduced-motion кадр рисуется один раз, без анимации.
 */
function Precipitation({ weather, phase }: { weather: Weather; phase: Phase }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (weather === 'clear') return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const color = getComputedStyle(document.documentElement).getPropertyValue('--precip').trim()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let width = 0
    let height = 0

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const count = weather === 'rain' ? 150 : 90
    const particles = Array.from({ length: count }, () => spawn(weather, width, height, true))

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = color
      ctx.fillStyle = color

      for (const p of particles) {
        if (weather === 'rain') {
          ctx.globalAlpha = p.alpha
          ctx.lineWidth = p.size
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.drift * 3, p.y + p.length)
          ctx.stroke()
        } else {
          ctx.globalAlpha = p.alpha
          ctx.beginPath()
          ctx.arc(p.x + Math.sin(p.phase) * 14, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }

    const step = () => {
      for (const p of particles) {
        p.y += p.speed
        p.x -= p.drift
        p.phase += 0.012
        if (p.y > height + 20 || p.x < -30) Object.assign(p, spawn(weather, width, height, false))
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    let raf = 0
    if (reduced) draw()
    else raf = requestAnimationFrame(step)

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [weather, phase])

  if (weather === 'clear') return null
  return <canvas className="precip" ref={ref} />
}

function spawn(weather: Weather, width: number, height: number, initial: boolean) {
  const rain = weather === 'rain'
  return {
    x: Math.random() * (width + 120),
    y: initial ? Math.random() * height : -20 - Math.random() * 60,
    speed: rain ? 7 + Math.random() * 7 : 0.5 + Math.random() * 1.1,
    drift: rain ? 0.7 + Math.random() * 0.5 : 0.15 + Math.random() * 0.3,
    length: rain ? 12 + Math.random() * 16 : 0,
    size: rain ? 0.7 + Math.random() * 0.7 : 1 + Math.random() * 2,
    alpha: rain ? 0.25 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
  }
}
