import { Link } from 'react-router-dom'
import { Sky } from './Sky'
import type { AppData } from '../App'

/**
 * Витрина склона. Фоновая сцена приходится на самый низ окна и почти всегда
 * закрыта контентом, поэтому купленную живность показываем ещё и здесь —
 * в кадре, где её гарантированно видно.
 */
export function SceneCard({ data, caption }: { data: AppData; caption?: string }) {
  const { decor } = data.scene
  const empty = decor.items.length === 0

  return (
    <div className="scene-card">
      <Sky {...data.scene} framed />
      {empty ? (
        <Link to="/shop" className="scene-hint">
          Склон пока пустой — за ману в магазине сюда можно поселить корги
        </Link>
      ) : (
        caption && <span className="scene-hint quiet">{caption}</span>
      )}
    </div>
  )
}
