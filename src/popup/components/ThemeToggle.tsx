import type { ThemeMode } from '../../types'

interface ThemeToggleProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

const themeConfig = {
  light: {
    label: 'Light mode',
    next: 'dark' as ThemeMode,
  },
  dark: {
    label: 'Dark mode',
    next: 'auto' as ThemeMode,
  },
  auto: {
    label: 'Auto (System)',
    next: 'light' as ThemeMode,
  },
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const handleToggle = () => {
    onThemeChange(themeConfig[theme].next)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 group relative"
        aria-label={`Current theme: ${themeConfig[theme].label}. Click to switch to ${themeConfig[themeConfig[theme].next].label}`}
      >
        {/* Tooltip on hover */}
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {themeConfig[theme].label}
        </span>

        {theme === 'light' && (
          <svg
            className="w-5 h-5 text-amber-500 transition-transform group-hover:rotate-45 duration-300"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
        )}
        {theme === 'dark' && (
          <svg
            className="w-5 h-5 text-indigo-400 transition-transform group-hover:-rotate-12 duration-300"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
          </svg>
        )}
        {theme === 'auto' && (
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform group-hover:scale-110 duration-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      
      {/* Theme label */}
      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
        {themeConfig[theme].label}
      </span>
    </div>
  )
}
