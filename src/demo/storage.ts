/**
 * Записанные демо-версией файлы (база, правленые конспекты) в IndexedDB.
 * Ключ — путь в виртуальной файловой системе, значение — текст.
 *
 * Хранилище может быть недоступно (приватное окно, запрет сайтовых данных) —
 * тогда демо работает до перезагрузки страницы, а не падает.
 */
const DB_NAME = 'interview-trainer-demo'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

export async function loadAll(): Promise<Record<string, string>> {
  try {
    const db = await open()
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const out: Record<string, string> = {}
    await new Promise<void>((resolve, reject) => {
      const cursor = store.openCursor()
      cursor.onsuccess = () => {
        const c = cursor.result
        if (!c) return resolve()
        out[String(c.key)] = c.value as string
        c.continue()
      }
      cursor.onerror = () => reject(cursor.error)
    })
    db.close()
    return out
  } catch {
    return {}
  }
}

/** Пачка изменений: текст — записать, null — удалить. */
export async function saveAll(changes: Map<string, string | null>) {
  if (changes.size === 0) return
  try {
    const db = await open()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const [key, value] of changes) {
      if (value === null) store.delete(key)
      else store.put(value, key)
    }
    await done(tx)
    db.close()
  } catch {
    // Не сохранилось — демо продолжает работать в памяти
  }
}

export async function clearAll() {
  try {
    const db = await open()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    await done(tx)
    db.close()
  } catch {
    // Нечего чистить
  }
}
