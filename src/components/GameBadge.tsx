import { Link } from 'react-router-dom'
import type { GameResponse } from '../types'

/** Компактный статус в сайдбаре: цель дня. */
export function GameBadge({ game }: { game: GameResponse }) {
  const { daily } = game.game
  const goalPercent = Math.min(100, (game.progress.total / daily.goal) * 100)

  return (
    <Link to="/ascent" className="game-badge">
      <div className="row between" style={{ gap: 6 }}>
        <span className={`goal-ring ${daily.met ? 'met' : ''}`} style={{ '--p': `${goalPercent}%` } as React.CSSProperties}>
          <i>{daily.met ? '✓' : `${game.progress.total}/${daily.goal}`}</i>
        </span>
        <span className="hint" style={{ flex: 1 }}>
          {daily.met ? 'день закрыт' : 'цель дня'}
        </span>
      </div>
    </Link>
  )
}
