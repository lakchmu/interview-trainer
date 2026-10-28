import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { AppData } from '../App'
import { CODE_SETS, CODE_TASKS } from '../trainer/tasks'
import type {
  Program as ProgramData,
  ProgramBlock,
  ProgramTopic,
  Schedule as ScheduleData,
  ScheduleDay,
  ScheduleStep,
  TopicStatus,
} from '../types'

const STATUS_LABEL: Record<TopicStatus, string> = {
  gap: 'нет материала',
  todo: 'не начато',
  progress: 'в работе',
  done: 'пройдено',
}

const percent = (x: number) => Math.round(x * 100)

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const readLink = (rel: string, group: number) => `/notes?file=${encodeURIComponent(rel)}&group=${group}`

/** «2026-10-11» → «11 октября 2026». */
function longDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Куда ведёт кнопка шага. Обычно это решает сервер; шаги с задачами на код он
 * не знает (тренажёр живёт целиком в браузере), поэтому их связывает страница:
 * набор задач называет свой шаг расписания.
 */
function stepTarget(step: ScheduleStep): { link: string; action: string } | null {
  const set = CODE_SETS.find((s) => s.step === step.id)
  if (set) {
    const predict = CODE_TASKS.some((t) => t.set === set.id && t.kind === 'predict')
    return { link: `/code?set=${set.id}`, action: predict ? 'Решать' : 'Писать код' }
  }
  return step.link ? { link: step.link, action: step.action ?? 'Открыть' } : null
}

/** 250 → «4 ч 10 мин». */
function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

/** Сколько осталось до срока — словами, с точностью, которая имеет смысл. */
function untilText(deadline: string, now: number, label = 'до собеседования') {
  const left = new Date(deadline).getTime() - now
  if (Number.isNaN(left)) return ''
  if (left <= 0) return label === 'до собеседования' ? 'собеседование уже началось' : 'срок вышел'
  const minutes = Math.floor(left / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) {
    return `${label} ${days} ${plural(days, 'день', 'дня', 'дней')} ${hours} ${plural(hours, 'час', 'часа', 'часов')}`
  }
  if (hours > 0) {
    const rest = minutes % 60
    return `${label} ${hours} ${plural(hours, 'час', 'часа', 'часов')} ${rest} мин`
  }
  return `${label} ${minutes} мин`
}

export function Program({ data }: { data: AppData }) {
  const program = data.program
  const [busy, setBusy] = useState(false)

  // Шаги расписания закрываются по данным, которые меняются на других экранах:
  // вернулась с теста или из конспекта — план должен показать это сразу.
  useEffect(() => {
    void data.reload()
  }, [])

  if (!program) {
    return (
      <>
        <h1>План подготовки</h1>
        <div className="empty">
          <h3>Программа не найдена</h3>
          <p>
            Список тем лежит в <code>data/program/frontend.json</code>. Если файла нет или он не читается,
            план собрать не из чего.
          </p>
        </div>
      </>
    )
  }

  const setFocus = async (on: boolean) => {
    setBusy(true)
    try {
      await api.setConfig({ focus: on })
      await data.reload()
      data.toast(on ? `Фокус включён: в очереди только ${program.listName}` : 'Фокус выключен: в очереди все темы')
    } finally {
      setBusy(false)
    }
  }

  const { next } = program
  const queued = program.scopes.core + program.scopes.adjacent
  const schedule = program.schedule ?? null
  // Пока расписание действует, «что дальше» решает оно, а не общий порядок тем
  const today = (!schedule?.over && schedule?.days.find((d) => d.state === 'today')) || null
  const step = schedule?.next ?? null

  const toggleStep = async (target: ScheduleStep) => {
    if (target.auto) return
    await api.programStep(target.id, !target.manual)
    await data.reload()
  }

  return (
    <div className="program">
      <h1>{program.heading}</h1>
      <p className="subtitle">
        {program.title} ·{' '}
        {program.source.url ? (
          <a href={program.source.url} target="_blank" rel="noreferrer">
            {program.source.title}
          </a>
        ) : (
          program.source.title
        )}
        , сверено {longDate(program.source.checked)}
      </p>

      <section className="program-hero card-surface">
        <Ring value={program.readiness} />
        <div className="program-hero-body">
          <div className="program-hero-count">
            Пройдено {program.topicsDone} из {program.topicsTotal}{' '}
            {plural(program.topicsTotal, 'пункта', 'пунктов', 'пунктов')} списка
          </div>
          {today ? (
            step ? (
              <>
                <div className="program-next-label">
                  {step.overdue ? 'Осталось с прошлого дня' : 'Дальше по расписанию'}
                </div>
                <div className="program-next-title">{step.title}</div>
                <div className="row" style={{ marginTop: 12 }}>
                  {stepTarget(step) ? (
                    <Link className="btn primary" to={stepTarget(step)!.link}>
                      {stepTarget(step)!.action}
                    </Link>
                  ) : (
                    <button className="btn primary" onClick={() => void toggleStep(step)}>
                      Готово
                    </button>
                  )}
                  <Link className="btn" to="/review">
                    Ежедневное повторение
                  </Link>
                </div>
                {step.hint && <p className="hint program-next-hint">{step.hint}</p>}
              </>
            ) : (
              <>
                <div className="program-next-label">На сегодня всё закрыто</div>
                <div className="program-next-title">Дальше — только если хочется</div>
                <div className="row" style={{ marginTop: 12 }}>
                  <Link className="btn" to="/review">
                    Ежедневное повторение
                  </Link>
                </div>
              </>
            )
          ) : next ? (
            <>
              <div className="program-next-label">Дальше по плану</div>
              <div className="program-next-title">
                {next.block} → {next.topic}
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                {next.kind === 'read' ? (
                  <Link className="btn primary" to={readLink(next.rel, next.group)}>
                    Читать раздел
                  </Link>
                ) : (
                  <Link className="btn primary" to={`/review?program=${next.topicId}`}>
                    Ответить на {next.left} {plural(next.left, 'карточку', 'карточки', 'карточек')}
                  </Link>
                )}
                <Link className="btn" to="/review">
                  Ежедневное повторение
                </Link>
              </div>
              {next.kind === 'read' && <p className="hint program-next-hint">{next.title}</p>}
            </>
          ) : (
            <>
              <div className="program-next-label">Список пройден целиком</div>
              <div className="program-next-title">Осталось удерживать: повторение по расписанию</div>
              <div className="row" style={{ marginTop: 12 }}>
                <Link className="btn primary" to="/review">
                  Открыть повторение
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="program-blocks-mini">
          {program.blocks.map((b) => (
            <a className="program-mini" key={b.id} href={`#block-${b.id}`} onClick={(e) => jump(e, b.id)}>
              <span>{b.title}</span>
              <b>{percent(b.progress)}%</b>
              <i className="program-mini-bar">
                <i style={{ width: `${percent(b.progress)}%` }} />
              </i>
            </a>
          ))}
        </div>
      </section>

      {schedule && <Schedule schedule={schedule} onToggle={toggleStep} />}

      {program.rule && (
        <aside className="program-rule">
          <b>Без подсказок.</b> {program.rule}
        </aside>
      )}

      <label className="program-focus card-surface">
        <input type="checkbox" checked={program.focus} disabled={busy} onChange={(e) => void setFocus(e.target.checked)} />
        <span>
          <b>Только {program.listName}</b>
          <small>
            {program.focus
              ? `В ежедневной очереди ${queued} ${plural(queued, 'карточка', 'карточки', 'карточек')}: сначала ${program.scopes.core} из списка, потом ${program.scopes.adjacent} соседних. Отложено ${program.out.cards} — их нет в списке.`
              : `Сейчас очередь собирается из всех ${queued + program.out.cards} карточек, включая ${program.out.cards} вне списка.`}
          </small>
        </span>
      </label>

      {program.blocks.map((b) => (
        <Block key={b.id} block={b} />
      ))}

      {program.adjacent && <Block block={program.adjacent} soft />}

      <OutOfScope program={program} />

      {program.resources.length > 0 && (
        <section className="program-block card-surface">
          <header className="program-block-head">
            <div>
              <h2>{program.resourcesTitle}</h2>
              {program.resourcesNote && <p className="hint">{program.resourcesNote}</p>}
            </div>
          </header>
          <ul className="program-resources">
            {program.resources.map((r) => (
              <li key={r.title}>
                <span className="pill ghost">{r.kind}</span>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                ) : (
                  <span>{r.title}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** «2026-10-12» → «пн, 12». */
function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })
}

function Schedule({
  schedule,
  onToggle,
}: {
  schedule: ScheduleData
  onToggle: (step: ScheduleStep) => Promise<void>
}) {
  // По умолчанию открыт сегодняшний день; вне расписания — ближайший к сроку
  const initial =
    schedule.days.find((d) => d.state === 'today') ??
    schedule.days.find((d) => d.state === 'future') ??
    schedule.days[schedule.days.length - 1]
  const [date, setDate] = useState(initial.date)
  const day = schedule.days.find((d) => d.date === date) ?? initial

  // Отсчёт идёт сам: страницу держат открытой часами
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="program-block card-surface schedule">
      <header className="program-block-head">
        <div>
          <h2>{schedule.title}</h2>
          <p className="hint">{untilText(schedule.deadline, now, schedule.deadlineLabel)}</p>
        </div>
        <div className="schedule-days" role="tablist">
          {schedule.days.map((d) => (
            <button
              key={d.date}
              role="tab"
              aria-selected={d.date === day.date}
              className={`schedule-day ${d.date === day.date ? 'on' : ''}`}
              data-state={d.state}
              data-done={d.total > 0 && d.done >= d.total}
              onClick={() => setDate(d.date)}
            >
              <span>{shortDay(d.date)}</span>
              <small>{d.total > 0 && d.done >= d.total ? 'закрыт' : `${d.done} из ${d.total}`}</small>
            </button>
          ))}
        </div>
      </header>

      <DayView day={day} onToggle={onToggle} />
    </section>
  )
}

function DayView({ day, onToggle }: { day: ScheduleDay; onToggle: (step: ScheduleStep) => Promise<void> }) {
  const closed = day.total > 0 && day.done >= day.total
  return (
    <>
      <div className="schedule-day-head">
        <b>
          {day.state === 'today' ? 'Сегодня: ' : ''}
          {day.title}
        </b>
        <span className="hint">
          {closed ? 'день закрыт' : `осталось примерно ${duration(day.minutesLeft)}`}
        </span>
      </div>
      {day.note && <p className="hint schedule-note">{day.note}</p>}

      {day.steps.map((step) => (
        <div className={`schedule-step ${step.done ? 'done' : ''}`} key={step.id}>
          <button
            className="schedule-check"
            aria-pressed={step.done}
            disabled={step.auto}
            title={
              step.auto
                ? 'Закрыт сам: это видно по твоим действиям'
                : step.done
                  ? 'Снять отметку'
                  : 'Отметить выполненным'
            }
            onClick={() => void onToggle(step)}
          />
          <div className="schedule-step-main">
            <div className="schedule-step-title">
              {step.title}
              {step.optional && <span className="pill ghost">по желанию</span>}
            </div>
            {step.hint && <p className="hint">{step.hint}</p>}
            <div className="program-topic-meta">
              <span>≈ {duration(step.minutes)}</span>
              {step.progress && step.progress.total > 0 && (
                <span>
                  {step.progress.done} из {step.progress.total}{' '}
                  {step.progress.unit === 'cards'
                    ? plural(step.progress.total, 'карточки', 'карточек', 'карточек')
                    : plural(step.progress.total, 'раздела', 'разделов', 'разделов')}
                </span>
              )}
              {step.result && <span>{step.result}</span>}
            </div>
          </div>
          {stepTarget(step) && (
            <Link className={`btn sm ${step.done ? '' : 'primary'}`} to={stepTarget(step)!.link}>
              {stepTarget(step)!.action}
            </Link>
          )}
        </div>
      ))}
    </>
  )
}

/** Плавный переход к блоку. Ссылка с # при HashRouter ушла бы в маршруты. */
function jump(e: React.MouseEvent, id: string) {
  e.preventDefault()
  document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Ring({ value }: { value: number }) {
  const r = 46
  const len = 2 * Math.PI * r
  return (
    <div className="program-ring" role="img" aria-label={`Готовность ${percent(value)}%`}>
      <svg viewBox="0 0 112 112">
        <circle className="ring-track" cx="56" cy="56" r={r} />
        <circle
          className="ring-value"
          cx="56"
          cy="56"
          r={r}
          strokeDasharray={`${len * Math.min(1, value)} ${len}`}
          transform="rotate(-90 56 56)"
        />
      </svg>
      <div className="program-ring-text">
        <b>{percent(value)}%</b>
        <span>готовность</span>
      </div>
    </div>
  )
}

function Block({ block, soft = false }: { block: ProgramBlock; soft?: boolean }) {
  return (
    <section className={`program-block card-surface ${soft ? 'soft' : ''}`} id={`block-${block.id}`}>
      <header className="program-block-head">
        <div>
          <h2>{block.title}</h2>
          {block.note && <p className="hint">{block.note}</p>}
        </div>
        <div className="program-block-meter">
          <b>{percent(block.progress)}%</b>
          <i className="program-mini-bar">
            <i style={{ width: `${percent(block.progress)}%` }} />
          </i>
        </div>
      </header>
      {block.topics.map((t) => (
        <TopicRow key={t.id} topic={t} />
      ))}
    </section>
  )
}

function TopicRow({ topic }: { topic: ProgramTopic }) {
  const { cards, reading } = topic
  // Куда вести «Читать»: к первому недочитанному разделу, а если всё прочитано —
  // к первому разделу темы, чтобы было где освежить.
  const target = topic.next?.kind === 'read' ? topic.next : topic.notes[0] ?? null
  const left = cards.total - cards.seen

  return (
    <div className="program-topic" data-status={topic.status}>
      <span className="program-dot" title={STATUS_LABEL[topic.status]} />
      <div className="program-topic-main">
        <div className="program-topic-title">
          {topic.title}
          {topic.detail && <span>{topic.detail}</span>}
        </div>
        {topic.why && <p className="hint program-why">{topic.why}</p>}
        <div className="program-topic-meta">
          {topic.status === 'gap' ? (
            <span className="program-gap">В приложении нет материала по этому пункту</span>
          ) : (
            <>
              {reading.charsTotal > 0 && (
                <span>
                  чтение {percent(reading.charsRead / reading.charsTotal)}% · {reading.sectionsRead}/{reading.sections}{' '}
                  {plural(reading.sections, 'раздел', 'раздела', 'разделов')}
                </span>
              )}
              {cards.total > 0 && (
                <span>
                  карточки {cards.seen}/{cards.total}
                  {cards.solid > 0 && ` · закреплено ${cards.solid}`}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="program-topic-bar" title={`${STATUS_LABEL[topic.status]} · ${percent(topic.progress)}%`}>
        <i style={{ width: `${percent(topic.progress)}%` }} />
      </div>
      <div className="program-topic-actions">
        {target && (
          <Link className={`btn sm ${topic.next?.kind === 'read' ? 'primary' : ''}`} to={readLink(target.rel, target.group)}>
            Читать
          </Link>
        )}
        {cards.total > 0 && (
          <Link className={`btn sm ${topic.next?.kind === 'cards' ? 'primary' : ''}`} to={`/review?program=${topic.id}`}>
            Учить{left > 0 ? ` · ${left}` : ''}
          </Link>
        )}
        {topic.quiz.map((q) => (
          <Link className="btn sm ghost" key={q.topic} to={`/quiz?topic=${q.topic}`} title={`Мини-тест: ${q.title}`}>
            Тест{q.best !== null ? ` · ${q.best}%` : ''}
          </Link>
        ))}
      </div>
    </div>
  )
}

function OutOfScope({ program }: { program: ProgramData }) {
  const { out } = program
  if (out.cards === 0 && out.files.length === 0) return null
  return (
    <details className="program-block card-surface program-out">
      <summary>
        <h2>{out.title}</h2>
        <span className="pill ghost">
          {out.cards} {plural(out.cards, 'карточка', 'карточки', 'карточек')}
        </span>
      </summary>
      {out.note && <p className="hint">{out.note}</p>}
      <div className="program-out-list">
        {out.decks.map((d) => (
          <Link className="btn sm" key={d.topic} to={`/review?topic=${d.topic}`}>
            {d.title} · {d.total}
          </Link>
        ))}
        {out.files.map((f) => (
          <Link className="btn sm ghost" key={f.rel} to={`/notes?file=${encodeURIComponent(f.rel)}`}>
            Конспект: {f.title}
          </Link>
        ))}
      </div>
    </details>
  )
}
