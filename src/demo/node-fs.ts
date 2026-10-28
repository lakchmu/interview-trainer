/**
 * node:fs для демо-сборки: файловая система в памяти.
 *
 * Серверный код (server/*.mjs) читает контент и пишет базу синхронными
 * вызовами fs. В браузере те же вызовы идут сюда: контент монтируется из
 * публичного снимка, а каждая запись отдаётся наружу через onWrite — оттуда
 * она попадает в IndexedDB и переживает перезагрузку.
 */
const files = new Map<string, string>()
const mtimes = new Map<string, number>()
let listener: (path: string, text: string | null) => void = () => {}

export function mount(entries: Record<string, string>, mtime: number) {
  for (const [path, text] of Object.entries(entries)) {
    files.set(path, text)
    mtimes.set(path, mtime)
  }
}

export function onWrite(fn: typeof listener) {
  listener = fn
}

function notFound(path: string): never {
  throw Object.assign(new Error(`ENOENT: no such file or directory, '${path}'`), { code: 'ENOENT' })
}

const isDir = (path: string) => {
  const prefix = path.endsWith('/') ? path : `${path}/`
  for (const key of files.keys()) if (key.startsWith(prefix)) return true
  return false
}

export function existsSync(path: string) {
  return files.has(path) || isDir(path)
}

export function readFileSync(path: string, _encoding?: string): string {
  const text = files.get(path)
  return text === undefined ? notFound(path) : text
}

export function writeFileSync(path: string, data: string) {
  files.set(path, String(data))
  mtimes.set(path, Date.now())
  listener(path, String(data))
}

export function renameSync(from: string, to: string) {
  writeFileSync(to, readFileSync(from))
  unlinkSync(from)
}

export function copyFileSync(from: string, to: string) {
  writeFileSync(to, readFileSync(from))
}

export function unlinkSync(path: string) {
  if (!files.delete(path)) notFound(path)
  mtimes.delete(path)
  listener(path, null)
}

export function mkdirSync() {
  // Папки здесь не хранятся: они существуют, пока в них есть файлы
}

interface Dirent {
  name: string
  isFile(): boolean
  isDirectory(): boolean
}

export function readdirSync(dir: string, options?: { withFileTypes?: boolean }): (string | Dirent)[] {
  if (!isDir(dir)) notFound(dir)
  const prefix = dir.endsWith('/') ? dir : `${dir}/`
  const entries = new Map<string, boolean>() // имя → это папка
  for (const key of files.keys()) {
    if (!key.startsWith(prefix)) continue
    const [name, ...rest] = key.slice(prefix.length).split('/')
    entries.set(name, entries.get(name) || rest.length > 0)
  }
  const names = [...entries.keys()].sort()
  if (!options?.withFileTypes) return names
  return names.map((name) => ({ name, isFile: () => !entries.get(name), isDirectory: () => !!entries.get(name) }))
}

export function statSync(path: string) {
  const directory = !files.has(path) && isDir(path)
  if (!directory && !files.has(path)) notFound(path)
  const mtimeMs = mtimes.get(path) ?? 0
  return {
    size: files.get(path)?.length ?? 0,
    mtimeMs,
    mtime: new Date(mtimeMs),
    isFile: () => !directory,
    isDirectory: () => directory,
  }
}

export default {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  mkdirSync,
  readdirSync,
  statSync,
}
