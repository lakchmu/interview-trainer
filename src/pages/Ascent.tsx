import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { AppData } from '../App'
import type { GameResponse, PeakProgress } from '../types'

/** 557000 → «557 тыс.»: знаки в чистом виде читать невозможно. */
function kchars(n: number) {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.', ',')} тыс.`
}

/** Страница обычного текста — 1800 знаков, привычная единица объёма. */
function pages(n: number) {
  return Math.round(n / 1800)
}

/** Короткое имя для подписи под вершиной — темы из конспектов помечаем точкой. */
function shortName(t: PeakProgress) {
  const base = t.title.split(':')[0].split(',')[0].split(' и ')[0].trim()
  return t.kb ? `• ${base}` : base
}

/** Высота вершины: сколько карточек темы вообще тронуто и сколько осело надолго. */
function peakHeight(t: PeakProgress) {
  return t.total ? (t.seen / t.total) * 0.6 + (t.mastered / t.total) * 0.4 : 0
}

export function Ascent({ data }: { data: AppData }) {
  const [game, setGame] = useState<GameResponse | null>(null)
  const [goalDraft, setGoalDraft] = useState<number | null>(null)

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

  const { level } = game
  const { daily, streak, stats } = game.game
  const unlockedCount = game.achievements.filter((a) => a.unlockedAt).length
  const peaks = [...game.topics].sort((a, b) => peakHeight(b) - peakHeight(a))
  const cleared = game.context.topicsCleared

  return (
    <>
      <h1>Восхождение</h1>
      <p className="subtitle">
        {level.title} · уровень {level.level} · {game.game.xp} XP всего.{' '}
        {level.nextTitle
          ? `До «${level.nextTitle}» осталось ${level.xpNeeded - level.xpInto} XP.`
          : 'Выше уже некуда.'}
      </p>

      {/* ------------------------------------------------ сегодня */}
      <div className="card-surface today-card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Сегодня</b>
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
          <div className="row" style={{ gap: 8 }}>
            <span className="hint">цель на день:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={goalDraft ?? daily.goal}
              onChange={(e) => setGoalDraft(Number(e.target.value))}
              onBlur={async () => {
                if (goalDraft && goalDraft !== daily.goal) {
                  await api.setGoal(goalDraft)
                  await load()
                }
                setGoalDraft(null)
              }}
              style={{ width: 70 }}
            />
          </div>
        </div>

        <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
          {daily.met
            ? 'Дальше — только если самой хочется. Серия уже засчитана, вина отменяется.'
            : `Цель намеренно маленькая: главное — начать. Чтением конспекта можно закрыть не больше ${game.progress.readCap} шагов из ${daily.goal} — остальное только карточками.`}
        </p>
      </div>

      {/* ------------------------------------------------ полоса статуса */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat">
          <div className="value">🔥 {streak.current}</div>
          <div className="label">дней подряд · рекорд {streak.best}</div>
        </div>
        <div className="stat">
          <div className="value">❄ {streak.freezes}</div>
          <div className="label">заморозки: пропуск не сожжёт серию</div>
        </div>
        <div className="stat">
          <div className="value">{cleared} / {game.context.topicsTotal}</div>
          <div className="label">вершин взято</div>
        </div>
        <div className="stat">
          <div className="value">{unlockedCount} / {game.achievements.length}</div>
          <div className="label">достижений</div>
        </div>
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
                className={`peak ${done ? 'done' : ''} ${t.kb ? 'kb' : ''}`}
                key={t.topic}
                title={`${t.title}: тронуто ${t.seen} из ${t.total}, выучено ${t.mastered}`}
              >
                <span className="peak-flag">{done ? '⛳' : ''}</span>
                <span className="peak-shape" style={{ height: `${20 + h * 110}px` }} />
                <span className="peak-name">{shortName(t)}</span>
                <span className="peak-pct">{Math.round(h * 100)}%</span>
              </Link>
            )
          })}
        </div>
        <p className="hint" style={{ marginTop: 14, marginBottom: 0 }}>
          Высота вершины — освоенность темы: 60% за то, что карточка вообще разобрана, 40% за то,
          что она осела надолго. Флаг появляется, когда в теме не осталось нетронутых карточек.
          Точкой помечены темы из твоих конспектов.
        </p>
      </div>

      {/* ------------------------------------------------ финальный босс */}
      <h2>Финальное испытание</h2>
      <div className="card-surface boss">
        <div className="row between">
          <div>
            <b style={{ fontSize: 15 }}>56 вопросов ревьюера</b>
            <p className="hint" style={{ margin: '4px 0 0' }}>
              {stats.confident > 0
                ? `Уверенно отвечаешь на ${stats.confident} из 56.`
                : 'Ещё не проверялась ни разу.'}
            </p>
          </div>
          <Link className="btn primary" to="/interview">
            {stats.confident > 0 ? 'Перепройти' : 'Бросить вызов'}
          </Link>
        </div>
        <div className="xp-bar" style={{ marginTop: 12 }}>
          <i style={{ width: `${(stats.confident / 56) * 100}%` }} className="met" />
        </div>
      </div>

      {/* ------------------------------------------------ разведка конспектов */}
      {game.reading.charsTotal > 0 && (
        <>
          <h2>Разведка конспектов</h2>
          <div className="card-surface">
            {/*
              Шкала считается по ЗНАКАМ, а не по числу карточек. Карточки
              различаются в десятки раз — от двух строк до страницы, — и счёт по
              их количеству говорит о пройденном пути неправду.
            */}
            <div className="row between" style={{ marginBottom: 10 }}>
              <b style={{ fontSize: 15 }}>
                Пройдено {kchars(game.reading.charsRead)} из {kchars(game.reading.charsTotal)} знаков
              </b>
              <span className="pill ghost">
                {Math.round((game.reading.charsRead / game.reading.charsTotal) * 100)}%
              </span>
            </div>
            <div className="xp-bar big">
              <i
                style={{ width: `${(game.reading.charsRead / game.reading.charsTotal) * 100}%` }}
                className={game.reading.charsRead >= game.reading.charsTotal ? 'met' : ''}
              />
            </div>

            <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
              Это {game.reading.read} из {game.reading.total} разделов и{' '}
              {pages(game.reading.charsRead)} из {pages(game.reading.charsTotal)} страниц
              обычного текста. Из разделов <b>{game.game.stats.sectionChecks ?? 0}</b> проверено
              карточками сразу после чтения — только это и показывает, осело ли прочитанное.
              {(game.game.stats.sectionsPerfect ?? 0) > 0 &&
                ` Целиком удержано: ${game.game.stats.sectionsPerfect}.`}
            </p>

            <div style={{ marginTop: 16 }}>
              {game.reading.files.map((f) => {
                const done = f.charsTotal > 0 && f.charsRead >= f.charsTotal
                const percent = f.charsTotal ? (f.charsRead / f.charsTotal) * 100 : 0
                return (
                  <div className="topic-row" key={f.rel}>
                    <div className="topic-name">
                      {f.title}
                      <small>
                        {Math.round(percent)}% · {kchars(f.charsTotal)} знаков, {f.read} из{' '}
                        {f.total} разделов{done ? ' · пройден целиком' : ''}
                      </small>
                    </div>
                    <div className="bar">
                      <span
                        className={done ? 'b-mature' : 'b-review'}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <Link className="btn sm" to={`/notes?file=${encodeURIComponent(f.rel)}`}>
                      Читать
                    </Link>
                  </div>
                )
              })}
            </div>
            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
              Шкала считается по объёму текста, а не по числу карточек: они различаются в
              десятки раз, и «31 из 695» сказало бы о пройденном пути неправду. Разметка схем в
              объём не входит.
            </p>
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
