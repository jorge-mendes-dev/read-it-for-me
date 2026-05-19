import type { ThemeMode } from '../../types'

interface ThemeToggleProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const handleToggle = () => onThemeChange('dark')
  const label = theme === 'dark' ? 'Dark mode' : 'Dark mode'

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className="p-2 rounded-md bg-surface-1 border border-hairline text-ink-muted"
        aria-label="Dark mode enabled"
      >
        <svg
          className="w-4 h-4 text-primary"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <span className="text-xs text-ink-subtle font-medium">{label}</span>
    </div>
  )
}
