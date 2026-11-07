/**
 * Темы, которые видит человек. Колоды остаются в данных как есть: на них держатся
 * правила программы и достижения. Но две колоды про одно и то же («React и
 * экосистема» и «React: VDOM…») в фильтрах и на карте выглядели как разные темы,
 * поэтому наружу показывается только тема.
 */
export const AREAS = [
  { id: 'javascript', title: 'JavaScript', decks: ['js-core', 'kb-javascript', 'js-extra'] },
  { id: 'typescript', title: 'TypeScript', decks: ['typescript', 'kb-typescript'] },
  { id: 'react', title: 'React', decks: ['react', 'kb-react'] },
  { id: 'vue', title: 'Vue и Nuxt', decks: ['vue'] },
  { id: 'layout', title: 'Вёрстка и браузер', decks: ['markup', 'web-platform', 'kb-browser'] },
  { id: 'http', title: 'HTTP и API', decks: ['kb-http'] },
  { id: 'architecture', title: 'Архитектура', decks: ['kb-architecture'] },
  { id: 'algorithms', title: 'Алгоритмы и системный дизайн', decks: ['algorithms'] },
  { id: 'livecoding', title: 'Лайвкодинг', decks: ['kb-livecoding'] },
  { id: 'process', title: 'Процессы, сборка и Git', decks: ['kb-process', 'tools'] },
]

const BY_DECK = new Map(AREAS.flatMap((area) => area.decks.map((deck) => [deck, area])))
const BY_ID = new Map(AREAS.map((area) => [area.id, area]))

/** Тема колоды или сама тема. Своя колода («Мои карточки») остаётся отдельной темой. */
export function areaOf(topic, title = topic) {
  const area = BY_DECK.get(topic) ?? BY_ID.get(topic)
  return area ? { id: area.id, title: area.title } : { id: topic, title }
}

/** В какую колоду класть карточку, которую перенесли в эту тему. */
export function deckOf(areaId) {
  return BY_ID.get(areaId)?.decks[0] ?? areaId
}

/** Темы карточек для фильтров: сначала общие в своём порядке, потом свои. */
export function areasOf(cards) {
  const found = new Map()
  for (const card of cards) {
    const area = areaOf(card.topic, card.topicTitle)
    found.set(area.id, area.title)
  }
  const rank = (id) => {
    const i = AREAS.findIndex((area) => area.id === id)
    return i < 0 ? AREAS.length : i
  }
  return [...found.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
}
