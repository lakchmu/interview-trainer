import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SceneCard } from '../components/SceneCard'
import { api } from '../api'
import type { AppData } from '../App'
import type { Stats } from '../types'

const WEEKS = 14

/** Последние 14 недель по дням — для тепловой карты активности. */
function heatDays() {
  const days: string[] = []
  const start = new Date()
  start.setDate(start.getDate() - (WEEKS * 7 - 1))
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function streakOf(daily: Stats['daily']) {
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    const entry = daily[key]
    const worked = entry && entry.new + entry.reviews > 0
    if (!worked) {
      // сегодняшний день ещё не «сломал» серию — просто ещё не занимались
      if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
        d.setDate(d.getDate() - 1)
        continue
      }
      break
    }
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function Dashboard({ data }: { data: AppData }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    void api.stats().then(setStats)
  }, [data.cards])

  const { due, learning, fresh } = useMemo(() => {
    const now = Date.now()
    // В фокусе на программе очередь собирается без карточек вне её — считаем так же,
    // иначе цифра здесь разошлась бы с бейджем в меню и с самой очередью.
    const focus = !!data.program?.focus
    const active = data.cards.filter((c) => !c.suspended && !(focus && c.scope === 'out'))
    return {
      due: active.filter(
        (c) => c.srs.state === 'review' && c.srs.due && new Date(c.srs.due).getTime() <= now,
      ).length,
      learning: active.filter(
        (c) =>
          (c.srs.state === 'learning' || c.srs.state === 'relearning') &&
          c.srs.due &&
          new Date(c.srs.due).getTime() <= now,
      ).length,
      fresh: active.filter((c) => c.srs.state === 'new').length,
    }
  }, [data.cards, data.program?.focus])

  if (!stats) return <div className="subtitle">Загрузка…</div>

  const todayKey = new Date().toISOString().slice(0, 10)
  const today = stats.daily[todayKey] ?? { new: 0, reviews: 0 }
  const plannedNew = Math.min(fresh, Math.max(0, data.config.newPerDay - today.new))
  const totalToday = due + learning + plannedNew
  const days = heatDays()
  const maxDay = Math.max(1, ...Object.values(stats.daily).map((d) => d.new + d.reviews))

  return (
    <>
      <h1>Обзор</h1>
      <p className="subtitle">
        {totalToday > 0
          ? `Сегодня к разбору ${totalToday} ${plural(totalToday, 'карточка', 'карточки', 'карточек')}.`
          : 'На сегодня всё повторено. Можно добавить новых карточек или отдохнуть.'}
      </p>

      <SceneCard data={data} />

      <div className="stat-grid">
        <div className="stat due">
          <div className="value">{due + learning}</div>
          <div className="label">к повторению сейчас</div>
        </div>
        <div className="stat new">
          <div className="value">{plannedNew}</div>
          <div className="label">новых на сегодня (из {fresh})</div>
        </div>
        <div className="stat">
          <div className="value">{today.new + today.reviews}</div>
          <div className="label">разобрано сегодня</div>
        </div>
        <div className="stat">
          <div className="value">{stats.retention === null ? '—' : `${Math.round(stats.retention * 100)}%`}</div>
          <div className="label">удержание (200 последних)</div>
        </div>
        <div className="stat">
          <div className="value">{streakOf(stats.daily)}</div>
          <div className="label">дней подряд</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <Link to="/review" className="btn primary">
          {totalToday > 0 ? `Начать повторение (${totalToday})` : 'Открыть тренажёр'}
        </Link>
        <Link to="/cards" className="btn">
          Все карточки
        </Link>
      </div>

      <h2>Прогресс по темам</h2>
      <div className="card-surface">
        {stats.byTopic.map((t) => {
          const pct = (n: number) => (t.total ? (n / t.total) * 100 : 0)
          return (
            <div className="topic-row" key={t.topic}>
              <div className="topic-name">
                {t.title}
                <small>
                  {t.total} карточек · выучено {t.mature} · в работе {t.learning + t.review - t.mature} · новых{' '}
                  {t.new}
                </small>
              </div>
              <div className="bar" title={`Выучено ${t.mature} из ${t.total}`}>
                <span className="b-mature" style={{ width: `${pct(t.mature)}%` }} />
                <span className="b-review" style={{ width: `${pct(t.review - t.mature)}%` }} />
                <span className="b-learning" style={{ width: `${pct(t.learning)}%` }} />
              </div>
              <Link className="btn sm" to={`/review?topic=${t.topic}`}>
                Учить
              </Link>
            </div>
          )
        })}
      </div>

      <h2>Активность</h2>
      <div className="card-surface">
        <div className="heatmap">
          {days.map((day) => {
            const entry = stats.daily[day]
            const total = entry ? entry.new + entry.reviews : 0
            const intensity = total === 0 ? 0 : 0.25 + 0.75 * Math.min(1, total / maxDay)
            return (
              <div
                key={day}
                className="heat-cell"
                title={`${day}: ${total}`}
                style={
                  total > 0
                    ? { background: `color-mix(in srgb, var(--accent) ${intensity * 100}%, var(--bg-elev-2))` }
                    : undefined
                }
              />
            )
          })}
        </div>
        <p className="hint">Последние {WEEKS} недель, по дням.</p>
      </div>

      {stats.weakest.length > 0 && (
        <>
          <h2>Западает сильнее всего</h2>
          <div className="card-surface">
            {stats.weakest.map((w) => (
              <div className="topic-row" key={w.id} style={{ gridTemplateColumns: '1fr 120px' }}>
                <div className="topic-name">
                  {w.question.length > 110 ? `${w.question.slice(0, 110)}…` : w.question}
                  <small>{w.topic}</small>
                </div>
                <span className="pill">
                  забыто {w.lapses} · лёгкость {w.ease.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
