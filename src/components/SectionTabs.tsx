import { NavLink } from 'react-router-dom'

/** Вкладки внутри пункта меню: страницы остаются на своих адресах, ссылки на них не ломаются. */
export function SectionTabs({ label, items }: { label: string; items: { to: string; title: string }[] }) {
  return (
    <nav className="section-tabs" aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end className="section-tab">
          {item.title}
        </NavLink>
      ))}
    </nav>
  )
}
