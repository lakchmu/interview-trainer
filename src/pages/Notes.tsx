import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Markdown } from '../components/Markdown'
import { CardEditor } from '../components/CardEditor'
import { SectionCheck } from '../components/SectionCheck'
import { SelfCheck, checkKey, checkable, loadCheckResults } from '../components/SelfCheck'
import type { CheckResults } from '../components/SelfCheck'
import type { AppData } from '../App'
import type {
  NoteCard,
  NoteFile,
  NoteGroup,
  NoteIntro,
  NoteSection,
  ReadingCoverage,
  ReadingState,
} from '../types'

type Draft = { question: string; answer: string; sourceFile: string; source: 'notes' }

const LAST_FILE_KEY = 'notes.lastFile'

/** Действия, по которым видно, что человек прокручивает сам. */
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const

/** Отступ карточки от верха окна после прокрутки — тот же, что scroll-margin-top в CSS. */
const SCROLL_OFFSET = 16

/** Через сколько после начала плавной прокрутки проверить, что она дошла до места. */
const SETTLE_MS = 900

// Память между перезагрузками живёт в браузере. Хранилище может быть
// недоступно (приватный режим, запрет) — тогда просто работаем без памяти.
function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // без памяти страница работает как раньше
  }
}

/**
 * После вспышки «прочитано» — плавно к следующему шагу чтения.
 *
 * Следующий шаг — не всегда следующая карточка. У последней карточки раздела
 * это приглашение проверить себя: если проехать мимо него сразу к новому
 * разделу, проверка, ради которой всё и читалось, останется за верхним краем.
 */
function scrollToNext(card: HTMLElement, userTookOver: () => boolean) {
  const section = card.closest('.note-group')
  const inSection = section ? [...section.querySelectorAll<HTMLElement>('[data-card]')] : []
  const nextCard = inSection[inSection.indexOf(card) + 1]
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = calm ? 'auto' : 'smooth'

  if (nextCard) {
    nextCard.scrollIntoView({ behavior, block: 'start' })
    // Плавная прокрутка может остановиться чуть раньше, если по дороге
    // отрисовались карточки и раскладка сдвинулась. Один раз доводим до места —
    // но только если человек за это время сам не тронул страницу.
    window.setTimeout(() => {
      if (userTookOver() || !nextCard.isConnected) return
      if (Math.abs(nextCard.getBoundingClientRect().top - SCROLL_OFFSET) > 3) {
        nextCard.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    }, SETTLE_MS)
    return
  }
  // Раздел дочитан: показываем проверку целиком, а не прижатой к верху
  const check = section?.querySelector<HTMLElement>('.group-foot, .section-check')
  if (check) {
    check.scrollIntoView({ behavior, block: 'center' })
    return
  }
  const nextSection = section?.nextElementSibling
  if (nextSection instanceof HTMLElement && nextSection.classList.contains('note-group')) {
    nextSection.scrollIntoView({ behavior, block: 'start' })
  }
}

/** Сколько живёт вспышка «прочитано». Чуть дольше самой долгой анимации в CSS. */
const BURST_MS = 3400

type Spark = { dx: number; dy: number; size: number; delay: number; turn: number; dot: boolean }
type Burst = { x: number; y: number; delay: number; sparks: Spark[] }

/**
 * Фейерверк: семь залпов в разных местах карточки, один за другим.
 *
 * У каждого залпа звёзды разлетаются по кругу; углы и дальность слегка
 * разбросаны, иначе выходит ровная ромашка, а не взрыв. Разброс считается один
 * раз при загрузке и от фиксированного зерна: рисунок получается живой, но
 * одинаковый при каждом нажатии и не меняется между перерисовками.
 */
function makeFireworks(): Burst[] {
  let seed = 20261013
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  // место залпа в процентах от карточки и его задержка
  const centers: [number, number, number][] = [
    [18, 70, 240],
    [58, 32, 460],
    [84, 62, 680],
    [36, 22, 900],
    [66, 80, 1120],
    [10, 28, 1340],
    [90, 24, 1560],
  ]
  return centers.map(([x, y, delay]) => {
    const count = 30
    const radius = 88 + rnd() * 28
    const sparks = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.4
      // Три кольца: дальнее очерчивает шар, среднее и ближнее заполняют его.
      // С одним кольцом залп выглядит пустым обручем.
      const ring = i % 3
      const dist =
        radius * (ring === 0 ? 0.84 + rnd() * 0.32 : ring === 1 ? 0.5 + rnd() * 0.26 : 0.2 + rnd() * 0.24)
      return {
        dx: Math.round(Math.cos(angle) * dist),
        dy: Math.round(Math.sin(angle) * dist),
        size: Math.round(8 + rnd() * 9),
        delay: Math.round(rnd() * 130),
        turn: Math.round(-90 + rnd() * 180),
        // каждая четвёртая — круглая искра, остальные — звёздочки
        dot: i % 4 === 3,
      }
    })
    return { x, y, delay, sparks }
  })
}

const FIREWORKS = makeFireworks()

/** 557000 → «557 тыс.»: знаки в чистом виде читать невозможно. */
function kchars(n: number) {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.', ',')} тыс.`
}

type Note = {
  /** Какому файлу принадлежит содержимое. Пока новый файл грузится, в состоянии
      ещё лежит прежний — по этому полю их и отличают. */
  rel: string
  content: string
  sections: NoteSection[]
  cards: NoteCard[]
  intro: NoteIntro | null
  groups: NoteGroup[]
  titles: Record<number, string>
}

export function Notes({ data }: { data: AppData }) {
  const [files, setFiles] = useState<NoteFile[] | null>(null)
  const [dirOk, setDirOk] = useState(true)
  /** Читаются ли конспекты, лежащие внутри приложения. */
  const [bundled, setBundled] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  /** Раздел, по которому сейчас идёт проверка. null — ни одного. */
  const [checking, setChecking] = useState<number | null>(null)
  /** Самопроверка по карточкам: раздел и карточка, с которой начали. */
  const [selfCheck, setSelfCheck] = useState<{ group: number; index: number } | null>(null)
  const [checkResults, setCheckResults] = useState<CheckResults>(() => loadCheckResults())
  const [draft, setDraft] = useState<Draft | null>(null)
  /** Номер карточки, открытой в редакторе. null — ни одной. */
  const [editing, setEditing] = useState<number | null>(null)
  /**
   * Раскрытые разделы. Полностью прочитанные сворачиваем, чтобы не пролистывать
   * их каждый раз заново. Состояние считается ОДИН РАЗ при открытии файла:
   * иначе раздел схлопывался бы прямо под руками, стоит отметить в нём последнюю
   * карточку.
   */
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set())
  /** Файл, для которого уже посчитали свёрнутость и прыгнули к месту чтения. */
  const settledFor = useRef<string | null>(null)
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<{ rel: string; title: string; line: number; excerpt: string }[]>([])
  const [reading, setReading] = useState<ReadingState | null>(null)
  // Переход из плана подготовки: /notes?file=…&group=3 открывает нужный раздел
  const [params, setParams] = useSearchParams()
  const wantedFile = params.get('file')
  const wantedGroup = params.get('group') ? Number(params.get('group')) : null
  /** Идущая сейчас доводка прокрутки до места чтения; см. scrollToPlace. */
  const scrollJob = useRef<(() => void) | null>(null)

  const loadReading = useCallback(async () => setReading(await api.reading()), [])

  useEffect(() => {
    void loadReading()
  }, [loadReading])

  useEffect(() => {
    void api.notes().then((res) => {
      setFiles(res.files)
      setDirOk(res.ok)
      setBundled(res.bundled)
      if (res.files.length && !active) {
        // Что открыть: файл из ссылки, иначе тот, что читали в прошлый раз,
        // иначе первый. Без памяти о прошлом файле перезагрузка страницы
        // всегда возвращала к первому конспекту.
        const pick =
          res.files.find((f) => f.rel === wantedFile) ??
          res.files.find((f) => f.rel === remembered(LAST_FILE_KEY)) ??
          res.files[0]
        setActive(pick.rel)
      }
    })
  }, [])

  useEffect(() => {
    if (active) remember(LAST_FILE_KEY, active)
  }, [active])

  // Браузер после перезагрузки сам пытается вернуть прежнюю прокрутку и делает
  // это раньше, чем карточки отрисованы, — попадает мимо. Место чтения
  // восстанавливает страница, поэтому на её время штатный механизм отключён.
  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => {
      history.scrollRestoration = previous
      scrollJob.current?.()
    }
  }, [])

  // Ссылка из плана может прийти, когда страница уже открыта на другом файле.
  // Раздел в ссылке — разовое указание: отработав, он снимается с адреса (см.
  // ниже), и это снятие не должно запускать всё заново.
  useEffect(() => {
    if (!wantedFile || !files?.some((f) => f.rel === wantedFile)) return
    if (wantedGroup === null && wantedFile === active) return
    settledFor.current = null
    setActive(wantedFile)
  }, [wantedFile, wantedGroup, files])

  /** Открыть файл из списка. Адрес обновляем, чтобы перезагрузка вернула сюда же. */
  const openFile = (rel: string) => {
    setActive(rel)
    setParams({ file: rel }, { replace: true })
  }

  /**
   * Довести страницу до места чтения.
   *
   * Одного прыжка мало: карточки за экраном имеют условную высоту
   * (content-visibility), и после прыжка, когда соседние отрисовываются,
   * нужная уезжает. Поэтому попыток несколько, с растущими паузами. Таймеры
   * живут отдельно от эффектов — иначе любая перерисовка отменяла бы прокрутку.
   * Как только человек сам взялся за прокрутку, доводка прекращается.
   */
  const scrollToPlace = (selector: string | null) => {
    scrollJob.current?.()
    let active = true
    const timers: number[] = []
    const stop = () => {
      active = false
      timers.forEach((id) => window.clearTimeout(id))
      for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop)
      if (scrollJob.current === stop) scrollJob.current = null
    }
    for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true })

    const go = () => {
      if (!active) return
      if (!selector) {
        window.scrollTo(0, 0)
        return
      }
      const el = document.querySelector(selector)
      // Уже на месте — не дёргаем страницу лишний раз
      if (el && Math.abs(el.getBoundingClientRect().top - SCROLL_OFFSET) > 3) {
        el.scrollIntoView({ block: 'start' })
      }
    }
    for (const ms of [60, 220, 500, 900, 1400]) timers.push(window.setTimeout(go, ms))
    timers.push(window.setTimeout(stop, 1500))
    scrollJob.current = stop
  }

  useEffect(() => {
    if (!active) return
    setNote(null)
    setChecking(null)
    setEditing(null)
    settledFor.current = null
    // Ответ на прежний файл может прийти позже, чем на новый, — его отбрасываем
    let stale = false
    void api.note(active).then((loaded) => {
      if (!stale) setNote(loaded)
    })
    return () => {
      stale = true
    }
  }, [active])

  useEffect(() => {
    if (search.trim().length < 2) {
      setHits([])
      return
    }
    const timer = setTimeout(() => void api.searchNotes(search).then(setHits), 250)
    return () => clearTimeout(timer)
  }, [search])

  const coverageByRel = useMemo(() => {
    const map = new Map<string, ReadingCoverage>()
    for (const c of reading?.coverage ?? []) map.set(c.rel, c)
    return map
  }, [reading])

  const isRead = useCallback(
    (index: number) => !!(active && reading?.marks[`${active}#${index}`]),
    [active, reading],
  )

  const toggleRead = async (card: { index: number; title: string }) => {
    if (!active) return
    try {
      const res = await api.toggleRead(active, card.index, card.title)
      if (res.reward) data.celebrate(res.reward)
      // Конспект изменили, пока страница была открыта: номера карточек у неё
      // старые. Сервер отметку поставил правильно, осталось перечитать список.
      if (res.stale) {
        setNote(await api.note(active))
        data.toast('Конспект обновился — список карточек перечитан')
      }
    } catch (e) {
      setNote(await api.note(active))
      data.toast(e instanceof Error ? e.message : 'Не удалось отметить карточку')
    }
    await loadReading()
  }

  /**
   * При открытии файла: свернуть полностью прочитанные разделы и поставить
   * страницу на первую непрочитанную карточку. Возврат к конспекту должен
   * продолжать чтение, а не начинать его сначала.
   */
  useEffect(() => {
    if (!note || !reading || !active) return
    // Сразу после смены файла в состоянии ещё лежит прежний конспект. Считать
    // по нему нельзя: разделы свернулись бы по чужому списку.
    if (note.rel !== active) return
    if (settledFor.current === active) return
    settledFor.current = active

    const read = (i: number) => !!reading.marks[`${active}#${i}`]
    const open = new Set<number>()
    for (const g of note.groups) {
      const cards = note.cards.filter((c) => c.group === g.group)
      if (!cards.every((c) => read(c.index))) open.add(g.group)
    }
    // Раздел, на который пришли по ссылке, раскрываем, даже если он прочитан.
    const target = active === wantedFile && wantedGroup !== null && note.groups.some((g) => g.group === wantedGroup)
      ? wantedGroup
      : null
    if (target !== null) open.add(target)
    setOpenGroups(open)

    // Куда встать. По ссылке на раздел — на первую непрочитанную карточку в
    // нём (если он прочитан целиком или не начат — на его заголовок). Без
    // ссылки, в том числе после перезагрузки, — на первую непрочитанную в файле.
    let selector: string | null
    if (target !== null) {
      const inGroup = note.cards.filter((c) => c.group === target)
      const unread = inGroup.find((c) => !read(c.index))
      selector =
        unread && unread.index !== inGroup[0]?.index ? `[data-card="${unread.index}"]` : `[data-group="${target}"]`
    } else {
      const firstStudy = note.cards.find((c) => c.group != null)
      const unread = note.cards.find((c) => c.group != null && !read(c.index))
      selector = !unread || unread.index === firstStudy?.index ? null : `[data-card="${unread.index}"]`
    }
    scrollToPlace(selector)

    // Раздел из ссылки отработан — снимаем его с адреса. Иначе перезагрузка
    // каждый раз возвращала бы к началу этого раздела, а не к месту чтения.
    if (wantedGroup !== null) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('group')
          return next
        },
        { replace: true },
      )
    }
  }, [note, reading, active, wantedFile, wantedGroup])

  /**
   * Сохранение правки. Файл переписывается только в строках этой карточки,
   * а номера карточек после правки могут сдвинуться — сервер присылает уже
   * пересчитанный список, поэтому просто подменяем его целиком.
   */
  const saveCard = async (card: NoteCard, body: string) => {
    if (!active) return
    const res = await api.saveNoteCard(active, card.index, body, card.body)
    setNote((prev) =>
      prev ? { ...prev, cards: res.cards, groups: res.groups, titles: res.titles } : prev,
    )
    setEditing(null)
    await loadReading()
    data.toast(
      res.marksDropped > 0
        ? `Сохранено. Снято отметок: ${res.marksDropped} — их заголовков больше нет`
        : 'Сохранено',
    )
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NoteFile[]>()
    for (const f of files ?? []) {
      const key = f.folder || '/'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    }
    return [...map.entries()]
  }, [files])

  const topics = useMemo(
    () => [...new Map(data.cards.map((c) => [c.topic, c.topicTitle])).entries()],
    [data.cards],
  )

  /**
   * Общая шкала. В фокусе на программе конспекты вне её не считаются — так же,
   * как в бейдже сайдбара, иначе две цифры про одно и то же разошлись бы.
   */
  const focus = !!data.program?.focus
  const outOfPlan = useCallback(
    (rel: string) => focus && data.program?.fileScope[rel] === 'out',
    [focus, data.program],
  )
  const scale = useMemo(() => {
    if (!reading) return null
    const list = reading.coverage.filter((c) => !outOfPlan(c.rel))
    const sum = (pick: (c: ReadingCoverage) => number) => list.reduce((s, c) => s + pick(c), 0)
    return {
      charsRead: sum((c) => c.charsRead),
      charsTotal: sum((c) => c.charsTotal),
      read: sum((c) => c.read),
      total: sum((c) => c.total),
      filesDone: list.filter((c) => c.total > 0 && c.read >= c.total).length,
    }
  }, [reading, outOfPlan])

  if (files === null) return <div className="subtitle">Читаю папку…</div>

  // Пустой путь в настройках означает «встроенные конспекты», а не «ничего не
  // подключено», поэтому судим по тому, нашлись ли файлы, а не по настройке.
  if (!dirOk || files.length === 0) {
    return (
      <>
        <h1>Конспекты</h1>
        <div className="empty">
          <h3>Конспекты не найдены</h3>
          <p>
            Обычно они лежат внутри приложения, в <code>data/notes</code>. Если там пусто или в
            настройках указана своя папка, которой больше нет, — поправь это в настройках.
          </p>
          <Link className="btn primary" to="/settings" style={{ marginTop: 12 }}>
            Открыть настройки
          </Link>
        </div>
      </>
    )
  }


  return (
    <>
      <h1>Конспекты</h1>
      <p className="subtitle">
        {files.length} файлов ·{' '}
        {bundled ? 'встроены в приложение' : <code>{data.config.notesDir}</code>}
      </p>

      {/*
        Шкала по всем конспектам сразу, в знаках. По числу карточек считать
        нельзя: они различаются в десятки раз, и доля карточек не равна доле
        пройденного текста.
      */}
      {scale && scale.charsTotal > 0 && (
        <div className="notes-scale">
          <div className="notes-scale-head">
            <b>Пройдено {Math.round((scale.charsRead / scale.charsTotal) * 100)}%</b>
            <span className="hint">
              {kchars(scale.charsRead)} из {kchars(scale.charsTotal)} знаков · {scale.read} из {scale.total} разделов
              {scale.filesDone > 0 && ` · файлов целиком: ${scale.filesDone}`}
              {focus && ' · без конспектов вне программы'}
            </span>
          </div>
          <div className="progress-track">
            <i style={{ width: `${(scale.charsRead / scale.charsTotal) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="notes-layout">
        <div className="notes-list">
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Поиск по всем файлам…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {hits.length > 0
            ? hits.map((hit, i) => (
                <div
                  key={`${hit.rel}-${i}`}
                  className={`note-file ${active === hit.rel ? 'active' : ''}`}
                  onClick={() => openFile(hit.rel)}
                >
                  {hit.title}
                  <small>
                    строка {hit.line}: …{hit.excerpt}…
                  </small>
                </div>
              ))
            : grouped.map(([folder, list]) => (
                <div key={folder}>
                  {/* Все конспекты лежат в корне, и заголовок папки вырождался
                      в одинокий «/». Показываем его только для вложенных. */}
                  {folder !== '/' && <div className="note-folder">{folder}</div>}
                  {list.map((f) => {
                    const c = coverageByRel.get(f.rel)
                    const on = active === f.rel
                    const pct = c && c.charsTotal ? (c.charsRead / c.charsTotal) * 100 : 0
                    return (
                      <div
                        key={f.rel}
                        className={`note-file ${on ? 'active' : ''} ${outOfPlan(f.rel) ? 'out' : ''}`}
                        onClick={() => openFile(f.rel)}
                      >
                        {f.title}
                        <small>
                          {outOfPlan(f.rel) && 'вне плана · '}
                          {c && c.charsTotal ? (
                            <>
                              {Math.round((c.charsRead / c.charsTotal) * 100)}% ·{' '}
                              {kchars(c.charsTotal)} знаков
                              {/* У открытого файла показываем ещё и разделы */}
                              {on && ` · ${c.read} из ${c.total} разделов`}
                            </>
                          ) : (
                            `${f.name}.md · ${Math.round(f.size / 1024)} КБ`
                          )}
                        </small>
                        {c && c.cardsTotal > 0 && (
                          <i className="note-file-bar" style={{ width: `${pct}%` }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
        </div>

        <div>
          {!note ? (
            <div className="subtitle">Выбери файл слева</div>
          ) : (
            <>
              {note.intro?.lead && (
                <div className="note-intro">
                  <Markdown text={note.intro.lead} />
                  {note.intro.rest && (
                    <span className="info-dot" tabIndex={0} role="note" aria-label="Об источнике материала">
                      i
                      <span className="info-pop">
                        <Markdown text={note.intro.rest} />
                      </span>
                    </span>
                  )}
                </div>
              )}

              {note.groups.map((g) => {
                const cards = note.cards.filter((c) => c.group === g.group)
                const done = cards.filter((c) => isRead(c.index)).length
                const open = openGroups.has(g.group)
                const toggleGroup = () =>
                  setOpenGroups((prev) => {
                    const next = new Set(prev)
                    next.has(g.group) ? next.delete(g.group) : next.add(g.group)
                    return next
                  })
                return (
                  <section className={`note-group ${open ? '' : 'collapsed'}`} key={g.group} data-group={g.group}>
                    <button className="note-group-head" onClick={toggleGroup} aria-expanded={open}>
                      <span className="group-caret" aria-hidden="true" />
                      <h2>{note.titles[g.group] ?? `Раздел ${g.group}`}</h2>
                      <span className={`pill ${done === cards.length ? 'notes' : 'ghost'}`}>
                        {done} / {cards.length}
                      </span>
                    </button>

                    {open && cards.map((card) => (
                      <ReadCard
                        key={card.index}
                        card={card}
                        read={isRead(card.index)}
                        editing={editing === card.index}
                        onEdit={() => setEditing(card.index)}
                        onCancel={() => setEditing(null)}
                        onSave={(body) => saveCard(card, body)}
                        onToggle={() => void toggleRead(card)}
                        checkResult={checkResults[checkKey(active!, card)]?.ok}
                        onSelfCheck={
                          checkable(card) ? () => setSelfCheck({ group: g.group, index: card.index }) : undefined
                        }
                        onDraft={() =>
                          setDraft({ question: card.title, answer: card.body, sourceFile: active!, source: 'notes' })
                        }
                      />
                    ))}

                    {!open ? null : checking === g.group ? (
                      <SectionCheck data={data} cardIds={g.cardIds} onClose={() => setChecking(null)} />
                    ) : (
                      g.cardIds.length > 0 && (
                        <div className="group-foot">
                          <button className="btn" onClick={() => setChecking(g.group)}>
                            Проверить себя по разделу · {g.cardIds.length}
                          </button>
                          <span className="hint">
                            Вспомнить прочитанное — единственный способ узнать, осело ли
                          </span>
                        </div>
                      )
                    )}
                  </section>
                )
              })}
            </>
          )}
        </div>
      </div>

      {selfCheck && note && (
        <SelfCheck
          // Новое открытие — новое окно: позиция и оценки не тянутся с прошлого
          key={`${note.rel}#${selfCheck.group}:${selfCheck.index}`}
          rel={note.rel}
          section={note.titles[selfCheck.group] ?? `Раздел ${selfCheck.group}`}
          cards={note.cards.filter((c) => c.group === selfCheck.group)}
          start={selfCheck.index}
          results={checkResults}
          onResult={setCheckResults}
          // Без этого «Повторение» не увидит новую карточку до перезагрузки страницы
          onSent={() => void data.reload()}
          onClose={() => setSelfCheck(null)}
        />
      )}

      {draft && (
        <CardEditor
          card={null}
          topics={topics}
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={async (msg) => {
            setDraft(null)
            data.toast(msg)
            await data.reload()
          }}
        />
      )}
    </>
  )
}

/**
 * Одна карточка конспекта. Отметка о прочтении даёт очки за каждую карточку,
 * а не одну выплату в конце длинного раздела: смысл в том, чтобы отдача
 * приходила часто, пока читаешь, а не когда-нибудь потом.
 */
function ReadCard({
  card,
  read,
  editing,
  onEdit,
  onCancel,
  onSave,
  onToggle,
  onDraft,
  onSelfCheck,
  checkResult,
}: {
  card: NoteCard
  read: boolean
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (body: string) => Promise<void>
  onToggle: () => void
  onDraft: () => void
  /** Открыть самопроверку с этой карточки; нет — карточка не учебная. */
  onSelfCheck?: () => void
  /** Итог прошлой самопроверки: вспомнила или нет. */
  checkResult?: boolean
}) {
  /**
   * Золотая вспышка в момент, когда карточку отметили прочитанной. Живёт только
   * от нажатия: карточки, прочитанные раньше, при открытии файла не сияют, и
   * снятие отметки тоже проходит тихо. Хуки стоят до раннего выхода ниже —
   * иначе их порядок менялся бы при входе в режим правки.
   */
  const [burst, setBurst] = useState(false)
  const article = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!burst) return

    // Пока идёт вспышка, следим, не взялся ли человек за страницу сам. Если
    // взялся — он уже решил, куда смотреть, и везти его дальше не нужно.
    let touched = false
    const touch = () => {
      touched = true
    }
    for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, touch, { passive: true })

    const id = setTimeout(() => {
      setBurst(false)
      if (!touched && article.current) scrollToNext(article.current, () => touched)
    }, BURST_MS)

    return () => {
      clearTimeout(id)
      // Слежение снимаем с запасом: оно ещё нужно доводке прокрутки ниже
      setTimeout(() => {
        for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, touch)
      }, SETTLE_MS + 100)
    }
  }, [burst])

  if (editing) return <CardMarkdownEditor card={card} onCancel={onCancel} onSave={onSave} />

  const mark = () => {
    setBurst(!read)
    onToggle()
  }

  // Callout'ы Obsidian («> [!tip]+ **Коротко:**») markdown не понимает и
  // печатает служебный маркер как текст. Заголовок вынимаем в подпись, а саму
  // строку маркера при отрисовке пропускаем. Файл при этом не меняется.
  const isCallout = card.kind !== 'heading' && card.kind !== 'text'
  const body = isCallout ? card.body.split('\n').slice(1).join('\n') : card.body

  return (
    <article
      ref={article}
      className={`note-card ${read ? 'read' : ''} ${burst ? 'just-read' : ''}`}
      data-kind={card.kind}
      data-card={card.index}
    >
      {/* Блик, который проходит по карточке. Свой слой с обрезкой: у самой
          карточки на время вспышки обрезка снята, чтобы сияние вышло за край */}
      {burst && <span className="read-shine" aria-hidden="true" />}
      {burst && (
        <span className="read-fireworks" aria-hidden="true">
          {FIREWORKS.map((b, bi) => (
            <span
              className="read-burst"
              key={bi}
              style={{ left: `${b.x}%`, top: `${b.y}%`, '--burst': `${b.delay}ms` } as React.CSSProperties}
            >
              <b className="read-flash" />
              {b.sparks.map((p, pi) => (
                <i
                  key={pi}
                  className={p.dot ? 'dot' : ''}
                  style={
                    {
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      '--size': `${p.size}px`,
                      '--delay': `${b.delay + p.delay}ms`,
                      '--turn': `${p.turn}deg`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </span>
          ))}
        </span>
      )}
      {isCallout && card.title && <div className="note-card-label">{card.title}</div>}
      <div className="note-card-body">
        <Markdown text={body} />
      </div>
      <div className="note-card-foot">
        <button className={`btn sm ${read ? 'read-on' : ''} ${burst ? 'pop' : ''}`} onClick={mark}>
          {read ? '✓ прочитано' : 'прочитано'}
        </button>
        {onSelfCheck && (
          <button
            className={`btn ghost sm selfcheck-open ${checkResult === true ? 'ok' : checkResult === false ? 'miss' : ''}`}
            onClick={onSelfCheck}
            title={
              checkResult === true
                ? 'В прошлый раз вспомнила'
                : checkResult === false
                  ? 'В прошлый раз не вспомнила — стоит повторить'
                  : 'Вопрос по карточке, ответ — по кнопке'
            }
          >
            {checkResult === true ? '✓ ' : checkResult === false ? '↻ ' : ''}проверить себя
          </button>
        )}
        <button className="btn ghost sm" onClick={onEdit}>
          править
        </button>
        <button className="btn ghost sm" onClick={onDraft}>
          в карточку
        </button>
      </div>
    </article>
  )
}

/**
 * Правка карточки: слева markdown, справа — то, во что он превратится.
 *
 * Пишется ровно в строки этой карточки, остальной файл не трогается. Если файл
 * успели изменить снаружи, сервер откажет — тогда лучше перечитать, чем молча
 * затереть чужую правку.
 */
function CardMarkdownEditor({
  card,
  onCancel,
  onSave,
}: {
  card: NoteCard
  onCancel: () => void
  onSave: (body: string) => Promise<void>
}) {
  const [text, setText] = useState(card.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    area.current?.focus()
  }, [])

  /**
   * Вставка через execCommand, а не подменой value напрямую.
   *
   * Прямая запись в value стирает нативную историю правок: после первой же
   * кнопки форматирования перестал бы работать ⌘Z. execCommand устарел, но
   * историю сохраняет и работает во всех браузерах, где это приложение живёт;
   * запасной путь оставлен на случай, если однажды перестанет.
   */
  const insert = (value: string) => {
    const ta = area.current
    if (!ta) return
    ta.focus()
    let ok = false
    try {
      ok = document.execCommand('insertText', false, value)
    } catch {
      ok = false
    }
    if (!ok) {
      const { selectionStart: s, selectionEnd: e } = ta
      const next = ta.value.slice(0, s) + value + ta.value.slice(e)
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(ta, next)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      ta.setSelectionRange(s + value.length, s + value.length)
    }
  }

  /** Обернуть выделение разметкой; если она уже стоит — снять. */
  const wrap = (marker: string) => {
    const ta = area.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e)
    const m = marker.length
    const already = value.slice(s - m, s) === marker && value.slice(e, e + m) === marker

    if (already) {
      ta.setSelectionRange(s - m, e + m)
      insert(sel)
      ta.setSelectionRange(s - m, s - m + sel.length)
      return
    }
    ta.setSelectionRange(s, e)
    insert(marker + sel + marker)
    // Выделяем внутренность: с пустым выделением это просто каретка между знаками
    ta.setSelectionRange(s + m, s + m + sel.length)
  }

  /** Список по строкам выделения; если все уже пункты — снять. */
  const toggleList = () => {
    const ta = area.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const from = value.lastIndexOf('\n', s - 1) + 1
    const nl = value.indexOf('\n', e)
    const to = nl === -1 ? value.length : nl
    const lines = value.slice(from, to).split('\n')
    const all = lines.every((l) => l.trim() === '' || /^\s*- /.test(l))
    const next = lines
      .map((l) => (l.trim() === '' ? l : all ? l.replace(/^(\s*)- /, '$1') : `- ${l}`))
      .join('\n')

    ta.setSelectionRange(from, to)
    insert(next)
    ta.setSelectionRange(from, from + next.length)
  }

  /** Заготовка таблицы в стиле конспектов — без пробелов вокруг разделителей. */
  const insertTable = () => {
    const ta = area.current
    if (!ta) return
    const { selectionStart: s, value } = ta
    const atLineStart = s === 0 || value[s - 1] === '\n'
    const prefix = atLineStart ? '' : '\n\n'
    const head = 'Столбец'
    insert(`${prefix}|${head}|${head}|\n|---|---|\n| | |\n| | |\n`)
    // Ставим выделение на первый заголовок — можно сразу печатать поверх
    const at = s + prefix.length + 1
    ta.setSelectionRange(at, at + head.length)
  }

  const dirty = text !== card.body

  const save = async () => {
    if (busy || !dirty) return
    setBusy(true)
    setError(null)
    try {
      await onSave(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void save()
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'b' || e.key === 'и')) {
      e.preventDefault()
      wrap('**')
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'i' || e.key === 'ш')) {
      e.preventDefault()
      wrap('*')
    }
  }

  return (
    <article className="note-card editing" data-kind={card.kind}>
      <div className="editor-head">
        <b>{card.title || 'Без заголовка'}</b>
        <span className="hint">⌘↵ сохранить · Esc отменить</span>
      </div>

      <div className="editor-tools">
        <button className="tool bold" title="Жирный · ⌘B" onClick={() => wrap('**')}>
          Ж
        </button>
        <button className="tool italic" title="Курсив · ⌘I" onClick={() => wrap('*')}>
          К
        </button>
        <button className="tool" title="Маркированный список" onClick={toggleList}>
          список
        </button>
        <button className="tool" title="Вставить заготовку таблицы" onClick={insertTable}>
          таблица
        </button>
        <span className="hint">повторное нажатие снимает разметку</span>
      </div>

      <div className="editor-split">
        <textarea
          ref={area}
          className="editor-source"
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="editor-preview">
          <Markdown text={text} />
        </div>
      </div>

      {error && <div className="editor-error">{error}</div>}

      <div className="note-card-foot">
        <button className="btn primary sm" disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? 'Сохраняю…' : 'Сохранить'}
        </button>
        <button className="btn ghost sm" onClick={onCancel}>
          Отмена
        </button>
        {dirty && <span className="hint">есть несохранённые правки</span>}
      </div>
    </article>
  )
}
