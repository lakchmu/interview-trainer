import { useState } from 'react'
import { api, DEMO } from '../api'
import type { AppData } from '../App'

export function Settings({ data }: { data: AppData }) {
  const [dir, setDir] = useState(data.config.notesDir)
  const [newPerDay, setNewPerDay] = useState(data.config.newPerDay)
  const [maxReviews, setMaxReviews] = useState(data.config.maxReviewsPerDay)
  const [check, setCheck] = useState<{ ok: boolean; message: string; resolved?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  /** Пустой путь — признак того, что читаются конспекты внутри приложения. */
  const bundled = !data.config.notesDir.trim()

  const topics = [...new Map(data.cards.map((c) => [c.topic, c.topicTitle])).entries()]

  return (
    <>
      <h1>Настройки</h1>
      <p className="subtitle">
        {DEMO ? (
          'Демо-версия: всё хранится в этом браузере.'
        ) : (
          <>
            Всё хранится локально в <code>data/db.json</code> внутри проекта.
          </>
        )}
      </p>

      {/* Папку с конспектами выбирают только локально: в демо файловой системы нет */}
      {!DEMO && (
        <>
          <h2>Конспекты</h2>
          <div className="card-surface">
            <div className={`bundled-notes ${bundled ? 'on' : ''}`}>
              <b>{bundled ? 'Конспекты встроены в приложение' : 'Подключена внешняя папка'}</b>
              <p className="hint">
                {bundled ? (
                  <>
                    Материалы лежат внутри проекта, в <code>data/notes</code>, и едут вместе с
                    приложением. Никакой внешней папки не нужно: ничего не отвалится, если её
                    переместят или не досинхронизирует облако.
                  </>
                ) : (
                  <>
                    Сейчас читается папка снаружи проекта. Приложение перестанет находить конспекты,
                    если её переместят или переименуют.
                  </>
                )}
              </p>
              {!bundled && (
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    await api.setConfig({ notesDir: '' })
                    setDir('')
                    setCheck(null)
                    await data.reload()
                    data.toast('Вернулись к встроенным конспектам')
                    setBusy(false)
                  }}
                >
                  Вернуть встроенные
                </button>
              )}
            </div>

            <details className="field" style={{ marginTop: 16 }}>
              <summary className="hint">Читать из своей папки вместо встроенной</summary>
              <div className="row" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="~/Documents/Заметки/Собеседование"
                  value={dir}
                  onChange={(e) => {
                    setDir(e.target.value)
                    setCheck(null)
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn"
                  disabled={!dir.trim()}
                  onClick={async () => setCheck(await api.checkDir(dir))}
                >
                  Проверить
                </button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    await api.setConfig({ notesDir: dir })
                    await data.reload()
                    data.toast(dir.trim() ? 'Папка сохранена' : 'Вернулись к встроенным конспектам')
                    setBusy(false)
                  }}
                >
                  Сохранить
                </button>
              </div>
              {check && (
                <p className="hint" style={{ color: check.ok ? 'var(--ok)' : 'var(--bad)' }}>
                  {check.message}
                  {check.resolved && ` → ${check.resolved}`}
                </p>
              )}
              <p className="hint">
                Пустое поле означает встроенные конспекты. Можно писать <code>~</code> — путь
                развернётся в домашнюю папку. Приложение читает файлы и записывает в них только
                то, что ты сама правишь кнопкой «править» у карточки — по одной карточке, не трогая
                остальной файл. Вложенные папки обходятся до 8 уровней, служебные
                (<code>node_modules</code>, <code>.git</code>, <code>.obsidian</code>) пропускаются.
              </p>
            </details>
          </div>
        </>
      )}

      <h2>Нагрузка</h2>
      <div className="card-surface">
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Новых карточек в день</label>
            <input
              type="number"
              min={0}
              max={200}
              value={newPerDay}
              onChange={(e) => setNewPerDay(Number(e.target.value))}
            />
            <p className="hint">
              Определяет темп. 15 в день — примерно 25–35 минут занятий, включая повторения.
            </p>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Максимум повторений в день</label>
            <input
              type="number"
              min={10}
              max={999}
              value={maxReviews}
              onChange={(e) => setMaxReviews(Number(e.target.value))}
            />
            <p className="hint">Ограничивает очередь, если накопился долг.</p>
          </div>
        </div>
        <button
          className="btn primary"
          onClick={async () => {
            await api.setConfig({ newPerDay, maxReviewsPerDay: maxReviews })
            await data.reload()
            data.toast('Лимиты сохранены')
          }}
        >
          Сохранить лимиты
        </button>
      </div>

      <h2>Как работает расписание</h2>
      <div className="card-surface">
        <p className="md">
          Используется SM-2 с шагами обучения: новая карточка показывается через 1 и 10 минут, затем
          выходит на дневные интервалы. Оценка меняет и интервал, и «лёгкость» карточки:
        </p>
        <ul className="md">
          <li>
            <b>Снова</b> — карточка забыта: интервал уменьшается вдвое, лёгкость −0.20, возврат
            через 10 минут.
          </li>
          <li>
            <b>Трудно</b> — вспомнил с усилием: интервал ×1.2, лёгкость −0.15.
          </li>
          <li>
            <b>Хорошо</b> — интервал × текущая лёгкость (обычно ×2.5).
          </li>
          <li>
            <b>Легко</b> — интервал × лёгкость × 1.3, лёгкость +0.15.
          </li>
        </ul>
        <p className="hint">
          К длинным интервалам добавляется случайный разброс ±5%, чтобы карточки, добавленные
          пачкой, не возвращались все в один день.
        </p>
      </div>

      <h2>Сброс прогресса</h2>
      <div className="card-surface">
        <p className="hint" style={{ marginTop: 0 }}>
          Сброс возвращает карточки в состояние «новая». Сам текст карточек не удаляется.
        </p>
        <div className="row">
          {topics.map(([id, title]) => (
            <button
              key={id}
              className="btn sm"
              onClick={async () => {
                if (!confirm(`Сбросить прогресс по теме «${title}»?`)) return
                await api.resetProgress(id)
                await data.reload()
                data.toast('Прогресс темы сброшен')
              }}
            >
              {title}
            </button>
          ))}
          <span className="spacer" />
          <button
            className="btn danger sm"
            onClick={async () => {
              if (!confirm('Сбросить весь прогресс и историю занятий?')) return
              await api.resetProgress()
              await data.reload()
              data.toast('Прогресс сброшен полностью')
            }}
          >
            Сбросить всё
          </button>
        </div>
      </div>

      <h2>Горячие клавиши</h2>
      <div className="card-surface">
        <div className="row" style={{ gap: 20 }}>
          <span>
            <span className="kbd">Space</span> показать ответ / оценить «Хорошо»
          </span>
          <span>
            <span className="kbd">1</span>…<span className="kbd">4</span> оценка
          </span>
          <span>
            <span className="kbd">⌘↵</span> сохранить карточку
          </span>
          <span>
            <span className="kbd">Esc</span> закрыть окно
          </span>
        </div>
      </div>
    </>
  )
}
