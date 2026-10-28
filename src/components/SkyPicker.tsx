import { PHASES, WEATHER_LABEL, phaseInfo } from '../theme'
import type { Phase, Resolved, SkySettings, Weather } from '../theme'

interface Props {
  settings: SkySettings
  resolved: Resolved
  onChange: (next: SkySettings) => void
}

export function SkyPicker({ settings, resolved, onChange }: Props) {
  const auto = settings.mode === 'auto' || settings.weather === 'auto'

  return (
    <div className="sky-picker">
      <select
        value={settings.mode}
        onChange={(e) => onChange({ ...settings, mode: e.target.value as 'auto' | Phase })}
        aria-label="Время суток"
      >
        <option value="auto">Время суток: авто</option>
        {PHASES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        value={settings.weather}
        onChange={(e) => onChange({ ...settings, weather: e.target.value as 'auto' | Weather })}
        aria-label="Погода"
      >
        <option value="auto">Погода: авто</option>
        {(Object.keys(WEATHER_LABEL) as Weather[]).map((w) => (
          <option key={w} value={w}>
            {WEATHER_LABEL[w]}
          </option>
        ))}
      </select>

      {auto && (
        <span className="hint">
          сейчас: {phaseInfo(resolved.phase).label.toLowerCase()},{' '}
          {WEATHER_LABEL[resolved.weather].toLowerCase()}
        </span>
      )}

      <label className="sky-toggle">
        <input
          type="checkbox"
          checked={settings.scenery}
          onChange={(e) => onChange({ ...settings, scenery: e.target.checked })}
        />
        пейзаж
      </label>
    </div>
  )
}
