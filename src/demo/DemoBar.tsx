import { useState } from 'react'
import { resetDemo } from './backend'
import { METRIKA_ID } from './metrika'

/** Плашка демо-версии: где живёт прогресс и как начать заново. */
export function DemoBar() {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="demo-bar" role="note">
      <span>
        <b>Демо.</b> Две недели занятий уже «прожиты», чтобы было что посмотреть. Прогресс хранится только в этом
        браузере.
        {METRIKA_ID ? ' Посещения считает Яндекс Метрика.' : null}
      </span>
      {confirming ? (
        <span className="demo-bar-actions">
          <button type="button" className="btn sm danger" onClick={() => void resetDemo()}>
            Стереть и начать заново
          </button>
          <button type="button" className="btn sm" onClick={() => setConfirming(false)}>
            Отмена
          </button>
        </span>
      ) : (
        <button type="button" className="btn sm" onClick={() => setConfirming(true)}>
          Начать заново
        </button>
      )}
    </div>
  )
}
