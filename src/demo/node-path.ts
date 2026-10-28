/**
 * node:path для демо-сборки: серверный код считает пути POSIX-строками
 * (корень — /app), этого подмножества ему хватает.
 */
export const sep = '/'

export function normalize(p: string): string {
  const absolute = p.startsWith('/')
  const out: string[] = []
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!absolute) out.push('..')
    } else out.push(part)
  }
  const body = out.join('/')
  return absolute ? `/${body}` : body || '.'
}

export const isAbsolute = (p: string) => p.startsWith('/')
export const join = (...parts: string[]) => normalize(parts.filter(Boolean).join('/'))

export function resolve(...parts: string[]): string {
  let acc = ''
  for (const part of parts) {
    if (!part) continue
    acc = isAbsolute(part) ? part : `${acc}/${part}`
  }
  return normalize(isAbsolute(acc) ? acc : `/${acc}`)
}

export function relative(from: string, to: string): string {
  const a = resolve(from).split('/').filter(Boolean)
  const b = resolve(to).split('/').filter(Boolean)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/')
}

export function dirname(p: string): string {
  const n = normalize(p)
  const i = n.lastIndexOf('/')
  if (i < 0) return '.'
  return i === 0 ? '/' : n.slice(0, i)
}

export function basename(p: string, ext?: string): string {
  const name = normalize(p).split('/').pop() ?? ''
  return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name
}

export function extname(p: string): string {
  const name = basename(p)
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i) : ''
}

export default { sep, normalize, isAbsolute, join, resolve, relative, dirname, basename, extname }
