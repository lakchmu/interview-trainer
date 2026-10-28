import { useEffect, useState } from 'react'
import type { Reward } from '../types'

type Popup = {
  key: number
  kind: 'xp' | 'mana' | 'level' | 'achievement' | 'goal'
  title: string
  sub?: string
}

let seq = 0

/**
 * Очередь всплывашек за опыт, уровни и достижения.
 * Мелкие «+6 XP» гаснут быстро, достижения висят дольше — их стоит заметить.
 */
export function Rewards({ reward }: { reward: Reward | null }) {
  const [popups, setPopups] = useState<Popup[]>([])

  useEffect(() => {
    if (!reward) return
    const next: Popup[] = []
    if (reward.gained > 0) {
      next.push({
        key: ++seq,
        kind: 'xp',
        title: `+${reward.gained} XP`,
        sub: reward.notes.join(' · ') || undefined,
      })
    }
    if (reward.mana > 0) {
      next.push({
        key: ++seq,
        kind: 'mana',
        title: `+${reward.mana} маны`,
        sub: reward.streakBonus > 0 ? `из них ${reward.streakBonus} за серию` : undefined,
      })
    }
    if (reward.goalJustMet) {
      next.push({ key: ++seq, kind: 'goal', title: 'День закрыт', sub: 'дальше — только если хочется' })
    }
    if (reward.levelUp) {
      next.push({
        key: ++seq,
        kind: 'level',
        title: `Уровень ${reward.levelUp.level} — ${reward.levelUp.title}`,
        sub: reward.levelUp.nextTitle ? `дальше: ${reward.levelUp.nextTitle}` : 'выше некуда',
      })
    }
    for (const a of reward.unlocked) {
      next.push({ key: ++seq, kind: 'achievement', title: a.title, sub: a.hint })
    }
    if (next.length === 0) return

    setPopups((prev) => [...prev, ...next])
    const timers = next.map((p) =>
      setTimeout(
        () => setPopups((prev) => prev.filter((x) => x.key !== p.key)),
        p.kind === 'xp' || p.kind === 'mana' ? 1600 : 4200,
      ),
    )
    return () => timers.forEach(clearTimeout)
  }, [reward])

  if (popups.length === 0) return null

  return (
    <div className="rewards">
      {popups.map((p) => (
        <div className={`reward-pop ${p.kind}`} key={p.key}>
          <span className="reward-icon">
            {p.kind === 'xp'
              ? '✦'
              : p.kind === 'mana'
                ? '◈'
                : p.kind === 'level'
                  ? '⛰'
                  : p.kind === 'goal'
                    ? '✓'
                    : '★'}
          </span>
          <span>
            <b>{p.title}</b>
            {p.sub && <small>{p.sub}</small>}
          </span>
        </div>
      ))}
    </div>
  )
}
