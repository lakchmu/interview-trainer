import { Link } from 'react-router-dom'
import type { GameResponse } from '../types'

/** Компактный статус в сайдбаре: уровень, полоса опыта, серия и дневная цель. */
export function GameBadge({ game }: { game: GameResponse }) {
  const { level } = game
  const { daily, streak } = game.game
  const percent = level.xpNeeded ? (level.xpInto / level.xpNeeded) * 100 : 100
  const goalPercent = Math.min(100, (game.progress.total / daily.goal) * 100)

  return (
    <Link to="/ascent" className="game-badge">
      <div className="row between" style={{ gap: 6 }}>
        <b>{level.title}</b>
        <span className="pill ghost">ур. {level.level}</span>
      </div>

      <div className="xp-bar" title={`${game.game.xp} XP всего`}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <span className="hint">
        {level.xpNeeded ? `${level.xpInto} / ${level.xpNeeded} XP` : `${game.game.xp} XP`}
      </span>

      <div className="mana-line" title="Мана — валюта магазина украшений">
        <span className="mana-orb sm" />
        <b>{game.game.mana}</b>
        <small>маны</small>
      </div>

      <div className="row between" style={{ marginTop: 8, gap: 6 }}>
        <span className={`goal-ring ${daily.met ? 'met' : ''}`} style={{ '--p': `${goalPercent}%` } as React.CSSProperties}>
          <i>{daily.met ? '✓' : `${game.progress.total}/${daily.goal}`}</i>
        </span>
        <span className="hint" style={{ flex: 1 }}>
          {daily.met ? 'день закрыт' : 'дневная цель'}
        </span>
        {streak.current > 0 && (
          <span className="pill streak" title={`Лучшая серия: ${streak.best}. Заморозок: ${streak.freezes}`}>
            🔥 {streak.current}
          </span>
        )}
      </div>
    </Link>
  )
}
