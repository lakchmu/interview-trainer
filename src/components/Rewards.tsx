import { useEffect, useState } from 'react'
import type { Reward } from '../types'

type Popup = {
  key: number
  kind: 'mana' | 'achievement' | 'goal'
  title: string
  sub?: string
}

let seq = 0

/**
 * Очередь всплывашек за ману, закрытый день и достижения.
 * Мелкие «+1 маны» гаснут быстро, достижения висят дольше — их стоит заметить.
 */
export function Rewards({ reward }: { reward: Reward | null }) {
  const [popups, setPopups] = useState<Popup[]>([])

  useEffect(() => {
    if (!reward) return
    const next: Popup[] = []
    if (reward.mana > 0) {
      next.push({ key: ++seq, kind: 'mana', title: `+${reward.mana} маны` })
    }
    if (reward.goalJustMet) {
      next.push({ key: ++seq, kind: 'goal', title: 'День закрыт', sub: 'дальше — только если хочется' })
    }
    for (const a of reward.unlocked) {
      next.push({ key: ++seq, kind: 'achievement', title: a.title, sub: a.hint })
    }
    if (next.length === 0) return

    setPopups((prev) => [...prev, ...next])
    const timers = next.map((p) =>
      setTimeout(
        () => setPopups((prev) => prev.filter((x) => x.key !== p.key)),
        p.kind === 'mana' ? 1600 : 4200,
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
            {p.kind === 'mana' ? '◈' : p.kind === 'goal' ? '✓' : '★'}
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
