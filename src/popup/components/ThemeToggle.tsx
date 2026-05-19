import type { ThemeMode } from '../../types'
import { t } from '../../utils/i18n'

interface ThemeToggleProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const options: Array<{ value: ThemeMode; title: string; icon: JSX.Element }> = [
    {
      value: 'light',
      title: t('lightMode'),
      icon: (
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
          <path
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
          />
        </svg>
      ),
    },
    {
      value: 'dark',
      title: t('darkMode'),
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.752 15.002A9 9 0 1112.998 2.25a.75.75 0 01.681 1.064A7.5 7.5 0 0020.686 13.32a.75.75 0 011.066.682z" />
        </svg>
      ),
    },
    {
      value: 'auto',
      title: t('autoThemeSystem'),
      icon: (
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="13" rx="2" strokeWidth="2" />
          <path strokeWidth="2" strokeLinecap="round" d="M8 20h8M10 17v3m4-3v3" />
        </svg>
      ),
    },
  ]

  return (
    <div
      className="inline-flex items-center rounded-md border border-hairline bg-surface-2 p-0.5 shadow-sm"
      role="radiogroup"
      aria-label={t('themeMode')}
    >
      {options.map((option) => {
        const isActive = option.value === theme

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onThemeChange(option.value)}
            role="radio"
            aria-checked={isActive}
            aria-label={option.title}
            title={option.title}
            className={[
              'min-w-7 h-7 px-2 rounded-sm text-xs font-semibold ui-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-ink-subtle hover:text-ink hover:bg-surface-3 hover:-translate-y-px',
            ].join(' ')}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}
