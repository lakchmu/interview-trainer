import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { AppData } from '../App'
import type { GameResponse, PeakProgress } from '../types'

/** Высота вершины: сколько карточек темы вообще тронуто и сколько осело надолго. */
function peakHeight(t: PeakProgress) {
  return t.total ? (t.seen / t.total) * 0.6 + (t.mastered / t.total) * 0.4 : 0
}

export function Ascent({ data }: { data: AppData }) {
  const [game, setGame] = useState<GameResponse | null>(null)

  const load = useCallback(async () => setGame(await api.game()), [])
  useEffect(() => {
    void load()
  }, [load, data.cards])

  const grouped = useMemo(() => {
    const map = new Map<string, GameResponse['achievements']>()
    for (const a of game?.achievements ?? []) {
      if (!map.has(a.group)) map.set(a.group, [])
      map.get(a.group)!.push(a)
    }
    return [...map.entries()]
  }, [game])

  if (!game) return <div className="subtitle">Загрузка…</div>

  const { daily, stats } = game.game
  const peaks = [...game.topics].sort((a, b) => peakHeight(b) - peakHeight(a))

  return (
    <>
      <h1>Восхождение</h1>
      <p className="subtitle">Цель дня, карта тем и достижения.</p>

      {/* ------------------------------------------------ цель дня */}
      <div className="card-surface today-card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Цель дня</b>
          {daily.met ? (
            <span className="pill" data-level="high">цель выполнена</span>
          ) : (
            <span className="hint">осталось {Math.max(0, daily.goal - game.progress.total)} шагов</span>
          )}
        </div>

        <div className="xp-bar big">
          <i
            style={{ width: `${Math.min(100, (game.progress.total / daily.goal) * 100)}%` }}
            className={daily.met ? 'met' : ''}
          />
        </div>

        <div className="row between" style={{ marginTop: 10 }}>
          <span className="hint">
            {game.progress.total} из {daily.goal} — карточек {game.progress.cards}, разделов конспекта{' '}
            {game.progress.reads}
            {game.progress.reads >= game.progress.readCap && ` (предел ${game.progress.readCap})`}
          </span>
          <Link className="btn ghost sm" to="/settings">
            Изменить цель
          </Link>
        </div>

        <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
          {daily.met
            ? 'Дальше — только если самой хочется.'
            : `Цель намеренно маленькая: главное — начать. Чтением конспекта можно закрыть не больше ${game.progress.readCap} шагов из ${daily.goal} — остальное только карточками.`}
        </p>
      </div>

      {/* ------------------------------------------------ карта */}
      <h2>Карта маршрута</h2>
      <div className="card-surface">
        <div className="peaks">
          {peaks.map((t) => {
            const h = peakHeight(t)
            const done = t.seen === t.total
            return (
              <Link
                to={`/review?topic=${t.topic}`}
                className={`peak ${done ? 'done' : ''}`}
                key={t.topic}
                title={`${t.title}: тронуто ${t.seen} из ${t.total}, выучено ${t.mastered}`}
              >
                <span className="peak-flag">{done ? '⛳' : ''}</span>
                <span className="peak-shape" style={{ height: `${20 + h * 110}px` }} />
                <span className="peak-name">{t.title}</span>
              </Link>
            )
          })}
        </div>
        <p className="hint" style={{ marginTop: 14, marginBottom: 0 }}>
          Высота вершины — освоенность темы: 60% за то, что карточка вообще разобрана, 40% за то,
          что она осела надолго. Флаг появляется, когда в теме не осталось нетронутых карточек.
        </p>
      </div>

      {/* Вопросы живут на дословных репликах интервьюеров — в демо их нет */}
      {data.cards.some((c) => c.asked) && (
        <>
      <h2>Вопросы ревьюера</h2>
      <div className="card-surface boss">
        <div className="row between">
          <div>
            <b style={{ fontSize: 15 }}>56 вопросов ревьюера</b>
            <p className="hint" style={{ margin: '4px 0 0' }}>
              {stats.confident > 0
                ? `Уверенно отвечаешь на ${stats.confident} из 56.`
                : 'Ещё не проходила.'}
            </p>
          </div>
          <Link className="btn primary" to="/interview">
            {stats.confident > 0 ? 'Пройти снова' : 'Пройти'}
          </Link>
        </div>
        <div className="xp-bar" style={{ marginTop: 12 }}>
          <i style={{ width: `${(stats.confident / 56) * 100}%` }} className="met" />
        </div>
      </div>
        </>
      )}

      {/* ------------------------------------------------ достижения */}
      <h2>Достижения</h2>
      {grouped.map(([group, items]) => (
        <div key={group} style={{ marginBottom: 18 }}>
          <div className="hint" style={{ marginBottom: 8 }}>{group}</div>
          <div className="achievements">
            {items.map((a) => {
              const locked = !a.unlockedAt
              return (
                <div className={`achievement ${locked ? 'locked' : ''}`} key={a.id}>
                  <span className="achievement-icon">{locked ? (a.secret ? '?' : '☆') : '★'}</span>
                  <div>
                    <b>{locked && a.secret ? 'Скрытое достижение' : a.title}</b>
                    <small>{locked && a.secret ? 'условие откроется вместе с ним' : a.hint}</small>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
