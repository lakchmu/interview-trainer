import { useId } from 'react'
import type { Decor } from '../types'
import type { Phase } from '../theme'

/**
 * Украшения сцены, купленные в магазине.
 *
 * Всё, что стоит на склоне, рисуется ВНУТРИ того же svg, что и хребты: тогда
 * оно масштабируется вместе с ними и не разъезжается при смене размера окна.
 * Корги бежит по невидимой копии линии ближнего хребта — из-за этого лапы
 * всегда точно на земле, как бы svg ни обрезало по краям.
 */

/** Линия ближнего хребта без замыкания — дорожка для корги и фонариков. */
const NEAR_RIDGE =
  'M0,356 C142,318 246,384 392,360 C520,339 616,388 742,368 C880,346 962,392 1104,370 C1236,350 1320,390 1440,364'

const COAT = '#dd8f4d'
const COAT_DARK = '#c2762f'
const CREAM = '#faf1e4'
const INK = '#3b2412'

export function RidgeDecor({
  decor,
  reduced,
  trail,
}: {
  decor: Decor
  reduced: boolean
  /** Доля прочитанных разделов конспекта, 0…1. Рисуется тропой по хребту. */
  trail: number
}) {
  const has = (id: string) => decor.items.includes(id)
  // Сцена рисуется дважды — фоном и врезкой, — поэтому id дорожки должен быть
  // свой у каждого экземпляра, иначе mpath обеих сошлётся на один и тот же путь.
  const trackId = `corgi-track-${useId().replace(/:/g, '')}`

  return (
    <>
      <defs>
        <path id={trackId} d={NEAR_RIDGE} fill="none" />
      </defs>

      {trail > 0 && <Trail progress={trail} />}
      {has('birds') && <Birds reduced={reduced} />}
      {has('balloon') && <Balloon reduced={reduced} />}
      {has('llama') && <Llama />}
      {has('lanterns') && <Lanterns />}
      {has('corgi') && <Corgi collar={decor.collar} reduced={reduced} trackId={trackId} />}
    </>
  )
}

/**
 * Пройденная часть маршрута. Это не покупка, а след от чтения конспектов:
 * тропа тянется по хребту ровно на ту долю, которую уже разведала.
 *
 * pathLength="100" нормирует длину кривой к сотне, поэтому доля превращается
 * в пунктир «столько-то из ста» без всякой арифметики по безье.
 */
function Trail({ progress }: { progress: number }) {
  const percent = Math.max(0, Math.min(1, progress)) * 100
  return (
    <path
      className="ridge-trail"
      d={NEAR_RIDGE}
      pathLength="100"
      strokeDasharray={`${percent} 100`}
    />
  )
}

// --------------------------------------------------------------------- корги

function Corgi({
  collar,
  reduced,
  trackId,
}: {
  collar: string | null
  reduced: boolean
  trackId: string
}) {
  const RUN = '46s'

  return (
    <g className="corgi-runner">
      {reduced ? (
        // Без анимации просто ставим её на склон — сцена остаётся живой на вид.
        <g transform="translate(742, 368)" />
      ) : (
        <>
          <animateMotion dur={RUN} repeatCount="indefinite" rotate="auto" calcMode="linear">
            <mpath href={`#${trackId}`} />
          </animateMotion>
          {/* Гасим у краёв, чтобы перескок с конца дорожки в начало не бросался в глаза */}
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.05;0.95;1"
            dur={RUN}
            repeatCount="indefinite"
          />
        </>
      )}

      <g transform={reduced ? 'translate(742, 368) scale(1.45)' : 'scale(1.45)'}>
        <g className="corgi-body">
          {/* хвост */}
          <ellipse className="corgi-tail" cx="-16" cy="-13.5" rx="4.4" ry="5.4" fill={COAT} />

          {/* задние лапы */}
          <g className="corgi-legs back">
            <rect x="-12.5" y="-7" width="3.4" height="7.4" rx="1.7" fill={COAT_DARK} />
            <rect x="-7.5" y="-7" width="3.4" height="7.4" rx="1.7" fill={COAT} />
          </g>
          {/* передние лапы */}
          <g className="corgi-legs front">
            <rect x="3.5" y="-7" width="3.4" height="7.4" rx="1.7" fill={COAT_DARK} />
            <rect x="8" y="-7" width="3.4" height="7.4" rx="1.7" fill={CREAM} />
          </g>

          {/* корпус */}
          <rect x="-14" y="-16" width="26" height="11" rx="5.5" fill={COAT} />
          <path d="M-11,-8.5 h20 a2,2 0 0 1 0,4 h-20 a2,2 0 0 1 0,-4 z" fill={CREAM} />

          {/* шея и грудь */}
          <path d="M7,-17 q6,1 6.5,7 l-6.5,0 z" fill={CREAM} />

          {collar && <Collar id={collar} />}

          {/* голова */}
          <g className="corgi-head">
            <path d="M10.6,-22.6 L11.4,-30.4 L15.8,-24.2 Z" fill={COAT} />
            <path d="M18.4,-23.4 L20.6,-30.8 L22.4,-23.2 Z" fill={COAT} />
            <circle cx="16.4" cy="-20.4" r="6.6" fill={COAT} />
            <ellipse cx="21.4" cy="-18.2" rx="4.3" ry="3.2" fill={CREAM} />
            <circle cx="24.6" cy="-18.8" r="1.35" fill={INK} />
            <circle cx="16.8" cy="-21.6" r="1.15" fill={INK} />
          </g>
        </g>
      </g>
    </g>
  )
}

/** Ошейники. Каждый садится на одно и то же место — основание шеи. */
function Collar({ id }: { id: string }) {
  if (id === 'collar-bandana') {
    return (
      <g className="corgi-collar">
        <path className="bandana" d="M8.4,-17.6 L15,-16.2 L10.4,-8.4 Z" fill="#2bb3a3" />
        <path d="M8.2,-17.8 L15.2,-16.3 l-0.5,2.4 l-7,-1.5 z" fill="#1d8b7e" />
      </g>
    )
  }
  if (id === 'collar-scarf') {
    return (
      <g className="corgi-collar">
        <path d="M8,-17.8 L15,-16.4 l-0.7,3.4 l-7,-1.4 z" fill="#d95b64" />
        <path className="scarf-tail" d="M8.6,-15.4 q-7,1.6 -12,-1.2 l1.4,-3.2 q4.6,2.4 10.4,1 z" fill="#d95b64" />
        <path d="M-2.6,-17.4 q2.6,1.2 5.4,1.4 l-0.2,2.6 q-3.2,-0.3 -6,-1.6 z" fill="#f0eae0" opacity="0.85" />
      </g>
    )
  }
  if (id === 'collar-bell') {
    return (
      <g className="corgi-collar">
        <path d="M8.2,-17.6 L15,-16.2 l-0.6,2.9 l-6.8,-1.4 z" fill="#8a5cd6" />
        <g className="bell">
          <circle cx="11.4" cy="-12.4" r="2.3" fill="#f2c14e" />
          <circle cx="11.4" cy="-11.6" r="0.7" fill="#a8801f" />
        </g>
      </g>
    )
  }
  if (id === 'collar-lights') {
    const bulbs = [
      { x: 8.6, y: -16.4, c: '#ff5d73' },
      { x: 10.6, y: -15.2, c: '#ffd166' },
      { x: 12.6, y: -14.4, c: '#4dd4ac' },
      { x: 14.4, y: -13.4, c: '#5aa9f7' },
    ]
    return (
      <g className="corgi-collar">
        <path d="M8,-17.4 L15,-16 l-0.5,2.4 l-6.8,-1.4 z" fill="#2c3550" />
        {bulbs.map((b, i) => (
          <circle
            key={b.c}
            className="fairy-bulb"
            cx={b.x}
            cy={b.y}
            r="1.5"
            fill={b.c}
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </g>
    )
  }
  // collar-red — классика
  return (
    <g className="corgi-collar">
      <path d="M8.2,-17.6 L15,-16.2 l-0.7,3.2 l-6.8,-1.5 z" fill="#cf3b46" />
      <rect x="10.6" y="-15.4" width="2" height="2" rx="0.4" fill="#e8b84b" />
    </g>
  )
}

// ---------------------------------------------------------------------- лама

function Llama() {
  return (
    <g className="llama" transform="translate(322, 286) scale(1.1)">
      <rect x="-11" y="-4.5" width="4" height="10" rx="1.8" fill="#8d7a68" />
      <rect x="-6" y="-4.5" width="4" height="10" rx="1.8" fill="#a08c78" />
      <rect x="3" y="-4.5" width="4" height="10" rx="1.8" fill="#8d7a68" />
      <rect x="7.5" y="-4.5" width="4" height="10" rx="1.8" fill="#a08c78" />
      <ellipse cx="0" cy="-9" rx="13" ry="7.5" fill="#efe2cf" />
      <path d="M-12.4,-11 q-3.4,-1.6 -4.2,1.6 q2.2,1.4 4.4,0.6 z" fill="#efe2cf" />
      <g className="llama-neck">
        <path d="M6,-13 q5,-3 6.6,-12 l4.6,1.2 q-1.6,10 -6.2,15 z" fill="#efe2cf" />
        <ellipse cx="16.6" cy="-25.6" rx="4" ry="3.2" fill="#efe2cf" />
        <path d="M14.2,-28 L14,-31.6 L16.2,-28.6 Z" fill="#efe2cf" />
        <path d="M17.6,-28.4 L18.6,-31.8 L19.6,-28 Z" fill="#efe2cf" />
        <circle cx="18.4" cy="-26" r="0.9" fill={INK} />
        <circle cx="20.2" cy="-24.6" r="0.7" fill="#7c6a58" />
      </g>
      {/* попона — чтобы лама читалась как лама, а не как овца */}
      <path d="M-8,-14.4 q8,-2.6 15,0 l-1.4,4 q-6.4,-2.2 -12.6,0 z" fill="#c2564f" />
      <path d="M-7.4,-10.6 q7.4,-2.2 13.8,0" stroke="#e0a24a" strokeWidth="1.4" fill="none" />
    </g>
  )
}

// --------------------------------------------------------------------- птицы

function Birds({ reduced }: { reduced: boolean }) {
  // Клин: ведущая птица впереди, остальные уступом назад и в стороны.
  const flock = [
    { x: 0, y: 0, s: 1 },
    { x: -26, y: 13, s: 0.9 },
    { x: -26, y: -13, s: 0.9 },
    { x: -52, y: 26, s: 0.82 },
    { x: -52, y: -26, s: 0.82 },
    { x: -78, y: 39, s: 0.74 },
  ]
  return (
    <g className={reduced ? 'flock still' : 'flock'} transform="translate(0, 118)">
      {flock.map((b, i) => (
        <g key={`${b.x}-${b.y}`} transform={`translate(${b.x}, ${b.y}) scale(${b.s})`}>
          <path
            className="bird"
            d="M-7,0 q3.6,-4.4 7,-0.6 q3.4,-3.8 7,0.6"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        </g>
      ))}
    </g>
  )
}

// ----------------------------------------------------------------------- шар

function Balloon({ reduced }: { reduced: boolean }) {
  return (
    <g className={reduced ? 'balloon still' : 'balloon'} transform="translate(0, 92)">
      <g className="balloon-bob">
        <path d="M0,-34 a17,19 0 0 1 17,19 q0,10 -17,21 q-17,-11 -17,-21 a17,19 0 0 1 17,-19 z" fill="#e8734a" />
        <path d="M0,-34 q-7,17 0,40 q7,-23 0,-40 z" fill="#f4d06f" />
        <path d="M0,-34 q-14,6 -16.4,12 q7,-9 16.4,-12 z" fill="#f4d06f" opacity="0.75" />
        <path d="M-5.4,6 L-3.4,11 M5.4,6 L3.4,11" stroke="#5a4632" strokeWidth="1" />
        <rect x="-4.6" y="10.6" width="9.2" height="6.4" rx="1.6" fill="#8a6438" />
      </g>
    </g>
  )
}

// ----------------------------------------------------------------- фонарики

/**
 * Гирлянда вдоль хребта. Точки расставлены не руками, а пунктиром по той же
 * линии: нулевая длина штриха с круглым концом даёт ровные бусины по кривой,
 * и они остаются на месте при любой ширине окна.
 */
function Lanterns() {
  return (
    <g className="lanterns">
      <path className="lantern-wire" d={NEAR_RIDGE} transform="translate(0,-7)" />
      <path className="lantern-bulbs" d={NEAR_RIDGE} transform="translate(0,-7)" />
    </g>
  )
}

// ------------------------------------------------------------------- сияние

/** Северное сияние живёт вне svg с хребтами — ему нужна вся высота неба. */
export function Aurora({ phase }: { phase: Phase }) {
  if (phase !== 'night' && phase !== 'dusk') return null
  return (
    <div className="aurora" aria-hidden="true">
      <i style={{ animationDelay: '0s' }} />
      <i style={{ animationDelay: '-7s' }} />
      <i style={{ animationDelay: '-13s' }} />
    </div>
  )
}
