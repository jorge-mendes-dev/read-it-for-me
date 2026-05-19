import { t } from '../../utils/i18n'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className="bg-surface-1 border border-hairline rounded-lg p-6 max-w-sm mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-3">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </div>
          <h2 id="welcome-title" className="text-xl font-semibold text-ink mb-2">
            {t('welcomeTitle')}
          </h2>
          <p className="text-ink-muted text-sm mb-4">{t('welcomeDescription')}</p>
          <div className="bg-surface-2 border border-hairline p-3 rounded-md mb-4 text-left">
            <p className="text-xs font-medium text-ink mb-2">{t('quickTips')}</p>
            <ul className="text-xs text-ink-muted space-y-1">
              <li>• {t('tipAutoDetect')}</li>
              <li>• {t('tipKeyboardShortcut')}</li>
              <li>• {t('tipPause')}</li>
              <li>• {t('tipStop')}</li>
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-3 font-medium ui-btn-primary ui-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close welcome guide"
        >
          {t('gotIt')}
        </button>
      </div>
    </div>
  )
}
