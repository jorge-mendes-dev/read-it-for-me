import type { ReactNode } from 'react'

interface SettingsSectionProps {
  id: string
  title: string
  icon: ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function SettingsSection({
  id,
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: SettingsSectionProps) {
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-surface-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-expanded={isExpanded}
        aria-controls={id}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-ink-muted">{title}</h2>
        </div>
        <svg
          className={`w-5 h-5 text-ink-tertiary transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div id={id} className="p-5 pt-0 space-y-4 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  )
}
