import { t } from '../../utils/i18n'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mb-3">
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
          <h2
            id="welcome-title"
            className="text-xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {t('welcomeTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            {t('welcomeDescription')}
          </p>
          <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-lg mb-4 text-left">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('quickTips')}
            </p>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <li>• {t('tipAutoDetect')}</li>
              <li>• {t('tipKeyboardShortcut')}</li>
              <li>• {t('tipPause')}</li>
              <li>• {t('tipStop')}</li>
            </ul>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
          aria-label="Close welcome guide"
        >
          {t('gotIt')}
        </button>
      </div>
    </div>
  )
}
