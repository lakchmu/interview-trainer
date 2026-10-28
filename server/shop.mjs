/**
 * Магазин украшений сцены. Валюта — мана.
 *
 * Всё, что здесь продаётся, — чистая косметика. Ни один предмет не влияет на
 * выдачу карточек, интервалы, статистику и оценку уровня: игра не должна уметь
 * подкручивать диагностику, иначе ей перестанет быть можно верить.
 *
 * Экономика намеренно отличается от опыта. Мана капает за ИЗВЛЕЧЕНИЕ из
 * памяти — карточки, тесты, проверку — и за закрытый день. За чтение конспекта
 * маны нет: иначе самым дешёвым путём к корги стало бы «пролистать и отметить
 * прочитанным», и магазин начал бы работать против учёбы.
 */

export const CATALOG = [
  // ---------------------------------------------------------------- живность
  {
    id: 'birds', title: 'Стая птиц', price: 40, group: 'Живность',
    hint: 'Тянется клином через небо и уходит за хребет',
  },
  {
    id: 'corgi', title: 'Корги', price: 120, group: 'Живность',
    hint: 'Бегает по ближнему хребту. Ей можно покупать ошейники',
  },
  {
    id: 'llama', title: 'Лама', price: 200, group: 'Живность',
    hint: 'Пасётся на среднем хребте и лениво поводит головой',
  },

  // ---------------------------------------------------------------- ошейники
  // Все требуют корги: без неё надевать не на кого.
  {
    id: 'collar-red', title: 'Красный ошейник', price: 30, group: 'Ошейники', slot: 'collar',
    requires: 'corgi', hint: 'Классика с латунной пряжкой',
  },
  {
    id: 'collar-bandana', title: 'Бирюзовая бандана', price: 45, group: 'Ошейники', slot: 'collar',
    requires: 'corgi', hint: 'Развевается на бегу',
  },
  {
    id: 'collar-scarf', title: 'Полосатый шарф', price: 60, group: 'Ошейники', slot: 'collar',
    requires: 'corgi', hint: 'Длинный, тянется следом',
  },
  {
    id: 'collar-bell', title: 'Ошейник с бубенцом', price: 75, group: 'Ошейники', slot: 'collar',
    requires: 'corgi', hint: 'Бубенец покачивается в такт шагам',
  },
  {
    id: 'collar-lights', title: 'Гирлянда', price: 110, group: 'Ошейники', slot: 'collar',
    requires: 'corgi', hint: 'Разноцветные огоньки — заметно в сумерках и ночью',
  },

  // ------------------------------------------------------------ склон и небо
  {
    id: 'lanterns', title: 'Фонарики на склоне', price: 90, group: 'Склон и небо',
    hint: 'Гирлянда вдоль ближнего хребта, разгорается к ночи',
  },
  {
    id: 'balloon', title: 'Воздушный шар', price: 150, group: 'Склон и небо',
    hint: 'Медленно плывёт над горами',
  },
  {
    id: 'aurora', title: 'Северное сияние', price: 240, group: 'Склон и небо',
    hint: 'Видно только в сумерках и ночью',
  },
]

const BY_ID = new Map(CATALOG.map((i) => [i.id, i]))

export function emptyShop() {
  return {
    owned: {}, // id -> время покупки
    active: {}, // id -> true, включено ли на сцене
    collar: null, // надетый ошейник, ровно один
  }
}

/** Куплен ли предмет, от которого зависит этот. */
function requirementMet(shop, item) {
  return !item.requires || !!shop.owned[item.requires]
}

/** Каталог с проставленным состоянием — ровно то, что рисует экран магазина. */
export function shopView(shop, mana) {
  return CATALOG.map((item) => ({
    ...item,
    owned: !!shop.owned[item.id],
    active: item.slot === 'collar' ? shop.collar === item.id : !!shop.active[item.id],
    locked: !requirementMet(shop, item),
    affordable: mana >= item.price,
  }))
}

/** Покупка. Возвращает либо { error }, либо купленный предмет. */
export function buyItem(db, id) {
  const item = BY_ID.get(id)
  if (!item) return { error: 'Такого предмета нет' }

  const shop = db.shop
  if (shop.owned[id]) return { error: 'Уже куплено' }
  if (!requirementMet(shop, item)) return { error: 'Сначала нужен корги' }
  if (db.game.mana < item.price) {
    return { error: `Не хватает ${item.price - db.game.mana} маны` }
  }

  db.game.mana -= item.price
  db.game.stats.purchases = (db.game.stats.purchases ?? 0) + 1
  shop.owned[id] = Date.now()
  // Покупку сразу видно на сцене — иначе непонятно, за что платила.
  if (item.slot === 'collar') shop.collar = id
  else shop.active[id] = true

  return { item }
}

/** Включить/выключить купленное. Ошейник снимается передачей on: false. */
export function equipItem(db, id, on) {
  const item = BY_ID.get(id)
  if (!item) return { error: 'Такого предмета нет' }
  const shop = db.shop
  if (!shop.owned[id]) return { error: 'Предмет не куплен' }

  if (item.slot === 'collar') shop.collar = on ? id : null
  else if (on) shop.active[id] = true
  else delete shop.active[id]

  return { ok: true }
}

/** Что реально рисовать на сцене — только купленное и включённое. */
export function decorOf(shop) {
  return {
    items: Object.keys(shop.active).filter((id) => shop.owned[id]),
    collar: shop.collar && shop.owned[shop.collar] ? shop.collar : null,
  }
}
