/*
 * Окружение задач на React для тренажёра кода. Собирается в один файл
 * (scripts/build-react-env.mjs → src/trainer/vendor/react-env.js) и кладётся
 * в Worker перед runner.js, как Vue и Pinia для задач на Vue.
 *
 * В Worker нет DOM, поэтому компоненты рендерит react-test-renderer: он строит
 * то же дерево React без браузера, с настоящими хуками, эффектами и act().
 * События не всплывают по DOM — помощники ниже вызывают обработчики из пропсов
 * напрямую, как это делал бы клик.
 *
 * Сборка — разработческая, а не продакшен: в ней React предупреждает о
 * пропущенных key и других ошибках, и эти предупреждения видны под тестами.
 */
import * as React from 'react'
import TestRenderer from 'react-test-renderer'
import { transform } from 'sucrase'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { act } = React

/** JSX и TypeScript → обычный JS. import из 'react' превращается в require. */
export function compile(source, { modules = true } = {}) {
  return transform(source, {
    transforms: modules ? ['jsx', 'typescript', 'imports'] : ['jsx', 'typescript'],
    jsxRuntime: 'classic',
    production: true,
  }).code
}

const isHost = (node) => typeof node.type === 'string'

function textOf(node) {
  if (node == null) return ''
  if (typeof node === 'string') return node
  return node.children.map(textOf).join('')
}

// Роли по умолчанию — как их понимает Testing Library, в упрощённом виде
const IMPLICIT_ROLES = {
  button: 'button',
  a: 'link',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  form: 'form',
  textarea: 'textbox',
  select: 'combobox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  dialog: 'dialog',
  nav: 'navigation',
}
function roleOf(node) {
  if (node.props.role) return node.props.role
  if (node.type === 'input') {
    const type = node.props.type ?? 'text'
    return { checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button' }[type] ?? 'textbox'
  }
  return IMPLICIT_ROLES[node.type] ?? null
}

function event(node, extra = {}) {
  return {
    preventDefault() {},
    stopPropagation() {},
    target: { value: node.props.value, checked: node.props.checked, name: node.props.name, ...extra },
    currentTarget: { value: node.props.value, checked: node.props.checked, name: node.props.name, ...extra },
    ...extra,
  }
}

function call(node, prop, ev) {
  if (!node) throw new Error('Элемент не найден — нечего нажимать')
  const handler = node.props[prop]
  if (typeof handler !== 'function') throw new Error(`У <${node.type}> нет обработчика ${prop}`)
  act(() => {
    handler(ev)
  })
}

/** Клик: вызывает onClick элемента. */
export const click = (node) => call(node, 'onClick', event(node))
/** Ввод: вызывает onChange с новым значением, как при наборе текста. */
export const type = (node, value) => call(node, 'onChange', event(node, { value }))
/** Флажок: onChange с новым checked. */
export const check = (node, checked = true) => call(node, 'onChange', event(node, { checked }))
/** Отправка формы: onSubmit. */
export const submit = (node) => call(node, 'onSubmit', event(node))
/** Нажатие клавиши: onKeyDown с key. */
export const keyDown = (node, key) => call(node, 'onKeyDown', event(node, { key }))

/**
 * Подождать реальное время. Ждём не внутри act: act копит обновления до своего
 * конца, и десять тиков таймера дали бы один рендер вместо десяти. Снаружи React
 * рендерит каждое обновление, как в браузере, а act в конце дочищает эффекты.
 * Флаг на время ожидания снят, иначе React ругался бы на обновления вне act.
 */
export async function wait(ms = 0) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  try {
    await new Promise((resolve) => setTimeout(resolve, ms))
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  }
  await act(async () => {})
}

export function render(element) {
  let renderer
  act(() => {
    renderer = TestRenderer.create(element)
  })
  const hosts = () => (renderer.toJSON() === null ? [] : renderer.root.findAll(isHost))
  const view = {
    /** Весь текст, который сейчас на экране. */
    text: () => hosts().length ? textOf(renderer.root) : '',
    /** Все элементы тега: view.all('li'). */
    all: (tag) => hosts().filter((n) => n.type === tag),
    /** i-й элемент тега или ошибка, если его нет. */
    get(tag, i = 0) {
      const found = view.all(tag)[i]
      if (!found) throw new Error(`На экране нет <${tag}>${i ? ` №${i + 1}` : ''}`)
      return found
    },
    /** Самый вложенный элемент, текст которого содержит строку. */
    byText(text) {
      const found = hosts().filter((n) => textOf(n).includes(text))
      if (!found.length) throw new Error(`На экране нет текста «${text}»`)
      return found.sort((a, b) => textOf(a).length - textOf(b).length)[0]
    },
    /** Элементы с ролью — явной (role="tab") или по тегу (button, li…). */
    allByRole: (role) => hosts().filter((n) => roleOf(n) === role),
    byRole(role, name) {
      const found = view.allByRole(role).filter((n) => name == null || textOf(n).includes(name) || n.props['aria-label'] === name)
      if (!found.length) throw new Error(`На экране нет элемента с ролью ${role}${name ? ` «${name}»` : ''}`)
      return found[0]
    },
    /** Элемент по data-testid. */
    byTestId(id) {
      const found = hosts().find((n) => n.props['data-testid'] === id)
      if (!found) throw new Error(`На экране нет data-testid="${id}"`)
      return found
    },
    rerender(next) {
      act(() => renderer.update(next))
    },
    unmount() {
      act(() => renderer.unmount())
    },
  }
  return view
}

/** Хук без компонента: result.current — то, что он вернул на последнем рендере. */
export function renderHook(hook, initialProps) {
  const result = { current: undefined, all: [] }
  function Probe({ props }) {
    result.current = hook(props)
    result.all.push(result.current)
    return null
  }
  let renderer
  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe, { props: initialProps }))
  })
  return {
    result,
    rerender(props) {
      act(() => renderer.update(React.createElement(Probe, { props })))
    },
    unmount() {
      act(() => renderer.unmount())
    },
  }
}

export { React, act }
