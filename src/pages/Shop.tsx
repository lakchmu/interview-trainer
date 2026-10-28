import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { AppData } from '../App'
import type { ShopItem } from '../types'
import { SceneCard } from '../components/SceneCard'

/** Порядок групп в витрине — от дешёвого к дорогому. */
const GROUPS = ['Живность', 'Ошейники', 'Склон и небо']

export function Shop({ data }: { data: AppData }) {
  const [items, setItems] = useState<ShopItem[] | null>(null)
  const [mana, setMana] = useState(0)
  const [earned, setEarned] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await api.shop()
    setItems(res.items)
    setMana(res.mana)
    setEarned(res.earned)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const buy = async (item: ShopItem) => {
    setBusy(item.id)
    setError(null)
    try {
      const res = await api.buy(item.id)
      setItems(res.items)
      setMana(res.mana)
      data.toast(`${item.title} — куплено`)
      // Сцена обновляется сразу, вместе с балансом маны в сайдбаре.
      data.celebrate({
        gained: 0, xp: 0, mana: 0, manaTotal: res.mana,
        streakBonus: 0, notes: [], goalJustMet: false, levelUp: null,
        unlocked: res.unlocked,
      })
      await data.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const toggle = async (item: ShopItem) => {
    const res = await api.equip(item.id, !item.active)
    setItems(res.items)
    await data.reload()
  }

  const byGroup = useMemo(() => {
    const map = new Map<string, ShopItem[]>()
    for (const item of items ?? []) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return GROUPS.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const)
  }, [items])

  if (!items) return <div className="subtitle">Загрузка…</div>

  const owned = items.filter((i) => i.owned).length
  const spent = earned - mana

  return (
    <>
      <h1>Магазин</h1>
      <p className="subtitle">
        Мана капает за <b>карточки, тесты и проверку</b> — и щедрее всего за закрытый день.
        За чтение конспекта маны нет: иначе самым дешёвым путём к корги было бы пролистать
        и отметить прочитанным.
      </p>

      <SceneCard data={data} caption="Так склон выглядит прямо сейчас" />

      <div className="mana-header">
        <div className="mana-balance">
          <span className="mana-orb" />
          <div>
            <b>{mana}</b>
            <small>маны в кошельке</small>
          </div>
        </div>
        <div className="mana-side">
          <div>
            <b>{earned}</b>
            <small>заработано всего</small>
          </div>
          <div>
            <b>{spent}</b>
            <small>потрачено</small>
          </div>
          <div>
            <b>
              {owned} / {items.length}
            </b>
            <small>предметов открыто</small>
          </div>
        </div>
      </div>

      {error && <div className="shop-error">{error}</div>}

      {byGroup.map(([group, list]) => (
        <section key={group}>
          <h2>{group}</h2>
          {group === 'Ошейники' && (
            <p className="hint" style={{ marginTop: -6 }}>
              Надет всегда один — выбери, в чём корги побежит сегодня.
            </p>
          )}
          <div className="shop-grid">
            {list.map((item) => (
              <article
                key={item.id}
                className="shop-card"
                data-owned={item.owned}
                data-locked={item.locked && !item.owned}
              >
                <div className="shop-art" data-item={item.id}>
                  <Preview id={item.id} />
                </div>

                <div className="shop-body">
                  <b>{item.title}</b>
                  <small>{item.hint}</small>
                </div>

                <div className="shop-foot">
                  {item.owned ? (
                    <label className="shop-toggle">
                      <input type="checkbox" checked={item.active} onChange={() => void toggle(item)} />
                      <span>{item.active ? 'на сцене' : 'убрано'}</span>
                    </label>
                  ) : item.locked ? (
                    <span className="hint">нужен корги</span>
                  ) : (
                    <button
                      className="btn sm"
                      disabled={!item.affordable || busy === item.id}
                      onClick={() => void buy(item)}
                    >
                      {item.affordable ? `Купить · ${item.price}` : `Не хватает ${item.price - mana}`}
                    </button>
                  )}
                  {!item.owned && <span className="price-tag">{item.price} ✦</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <h2>Откуда берётся мана</h2>
      <table className="rates">
        <tbody>
          <tr><td>Закрытая дневная цель</td><td><b>25</b></td><td className="hint">главный источник</td></tr>
          <tr><td>Бонус за серию</td><td><b>+3</b></td><td className="hint">× длину серии, максимум за 7 дней</td></tr>
          <tr><td>Разбор карточки</td><td><b>1</b></td><td className="hint">честное «снова» тоже считается</td></tr>
          <tr><td>Карточка выучена надолго</td><td><b>5</b></td><td className="hint">интервал дорос до 21 дня</td></tr>
          <tr><td>Мини-тест на 80%+</td><td><b>8</b></td><td className="hint">без ошибок — 15</td></tr>
          <tr><td>Проверка на вопросах ревьюера</td><td><b>12</b></td><td className="hint">за пройденный прогон</td></tr>
          <tr><td>Карточка из конспекта</td><td><b>2</b></td><td className="hint">за каждую созданную</td></tr>
          <tr className="dim"><td>Чтение конспекта</td><td><b>0</b></td><td className="hint">даёт опыт, но не ману — намеренно</td></tr>
        </tbody>
      </table>
    </>
  )
}

/** Маленькие превью — те же фигуры, что и на сцене, только статично. */
function Preview({ id }: { id: string }) {
  if (id === 'corgi' || id.startsWith('collar-')) {
    const coat = '#dd8f4d'
    const collars: Record<string, string> = {
      'collar-red': '#cf3b46',
      'collar-bandana': '#2bb3a3',
      'collar-scarf': '#d95b64',
      'collar-bell': '#8a5cd6',
      'collar-lights': '#2c3550',
    }
    return (
      <svg viewBox="-26 -36 56 44" role="img" aria-label="корги">
        <ellipse cx="-16" cy="-13.5" rx="4.4" ry="5.4" fill={coat} />
        <rect x="-12.5" y="-7" width="3.4" height="7.4" rx="1.7" fill="#c2762f" />
        <rect x="3.5" y="-7" width="3.4" height="7.4" rx="1.7" fill="#c2762f" />
        <rect x="-14" y="-16" width="26" height="11" rx="5.5" fill={coat} />
        <path d="M-11,-8.5 h20 a2,2 0 0 1 0,4 h-20 a2,2 0 0 1 0,-4 z" fill="#faf1e4" />
        <path d="M7,-17 q6,1 6.5,7 l-6.5,0 z" fill="#faf1e4" />
        {id.startsWith('collar-') && (
          <path d="M8.2,-17.6 L15,-16.2 l-0.7,3.2 l-6.8,-1.5 z" fill={collars[id] ?? '#cf3b46'} />
        )}
        {id === 'collar-lights' &&
          ['#ff5d73', '#ffd166', '#4dd4ac', '#5aa9f7'].map((c, i) => (
            <circle key={c} cx={8.6 + i * 2} cy={-16.4 + i * 1} r="1.5" fill={c} />
          ))}
        <path d="M10.6,-22.6 L11.4,-30.4 L15.8,-24.2 Z" fill={coat} />
        <path d="M18.4,-23.4 L20.6,-30.8 L22.4,-23.2 Z" fill={coat} />
        <circle cx="16.4" cy="-20.4" r="6.6" fill={coat} />
        <ellipse cx="21.4" cy="-18.2" rx="4.3" ry="3.2" fill="#faf1e4" />
        <circle cx="24.6" cy="-18.8" r="1.35" fill="#3b2412" />
        <circle cx="16.8" cy="-21.6" r="1.15" fill="#3b2412" />
      </svg>
    )
  }

  if (id === 'llama') {
    return (
      <svg viewBox="-22 -36 46 46" role="img" aria-label="лама">
        <rect x="-11" y="-4.5" width="4" height="10" rx="1.8" fill="#8d7a68" />
        <rect x="3" y="-4.5" width="4" height="10" rx="1.8" fill="#8d7a68" />
        <ellipse cx="0" cy="-9" rx="13" ry="7.5" fill="#efe2cf" />
        <path d="M6,-13 q5,-3 6.6,-12 l4.6,1.2 q-1.6,10 -6.2,15 z" fill="#efe2cf" />
        <ellipse cx="16.6" cy="-25.6" rx="4" ry="3.2" fill="#efe2cf" />
        <path d="M14.2,-28 L14,-31.6 L16.2,-28.6 Z" fill="#efe2cf" />
        <path d="M17.6,-28.4 L18.6,-31.8 L19.6,-28 Z" fill="#efe2cf" />
        <circle cx="18.4" cy="-26" r="0.9" fill="#3b2412" />
        <path d="M-8,-14.4 q8,-2.6 15,0 l-1.4,4 q-6.4,-2.2 -12.6,0 z" fill="#c2564f" />
      </svg>
    )
  }

  if (id === 'birds') {
    return (
      <svg viewBox="-30 -18 60 36" role="img" aria-label="стая птиц">
        {[
          [0, -4], [-13, 3], [-13, -11], [-25, 9], [-25, -17],
        ].map(([x, y]) => (
          <path
            key={`${x}:${y}`}
            d={`M${x - 6},${y + 8} q3.2,-4 6,-0.6 q3,-3.4 6,0.6`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ))}
      </svg>
    )
  }

  if (id === 'balloon') {
    return (
      <svg viewBox="-22 -38 44 60" role="img" aria-label="воздушный шар">
        <path d="M0,-34 a17,19 0 0 1 17,19 q0,10 -17,21 q-17,-11 -17,-21 a17,19 0 0 1 17,-19 z" fill="#e8734a" />
        <path d="M0,-34 q-7,17 0,40 q7,-23 0,-40 z" fill="#f4d06f" />
        <path d="M-5.4,6 L-3.4,11 M5.4,6 L3.4,11" stroke="#5a4632" strokeWidth="1" />
        <rect x="-4.6" y="10.6" width="9.2" height="6.4" rx="1.6" fill="#8a6438" />
      </svg>
    )
  }

  if (id === 'lanterns') {
    return (
      <svg viewBox="0 -16 100 32" role="img" aria-label="фонарики">
        <path d="M2,-6 Q26,10 50,-4 T98,-2" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path
          d="M2,-6 Q26,10 50,-4 T98,-2"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0.1 15"
        />
      </svg>
    )
  }

  // aurora
  return (
    <svg viewBox="0 0 100 44" role="img" aria-label="северное сияние">
      <defs>
        <linearGradient id="au" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ef2c0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5ef2c0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="au2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7aa8ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7aa8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M6,4 q14,10 26,2 t26,4 t30,-6 l0,26 q-16,8 -30,2 t-26,-4 t-26,6 z" fill="url(#au)" />
      <path d="M14,10 q16,8 28,2 t30,4 l0,18 q-16,6 -30,0 t-28,-2 z" fill="url(#au2)" opacity="0.75" />
    </svg>
  )
}
