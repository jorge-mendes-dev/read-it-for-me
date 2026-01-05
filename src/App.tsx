import { useState, useEffect } from 'react'
import { t, initializeLocale, setLocale, availableLocales } from './utils/i18n'
import { useTheme, useVoices } from './popup/hooks'
import { WelcomeModal, ThemeToggle, VoiceSelector, SettingsSection } from './popup/components'
import type { SettingsSection as SettingsSectionType } from './types'
import { UI_CONFIG } from './constants'
import browser from './utils/browser'

function App() {
  const { voices, isLoadingVoices } = useVoices()
  const [theme, setTheme] = useTheme()
  const [selectedVoice, setSelectedVoice] = useState<number>(0)
  const [currentLocale, setCurrentLocale] = useState('en')
  const [localeReady, setLocaleReady] = useState(false)
  const [logoUrl] = useState(() => browser.runtime.getURL('icons/icon128.png'))
  const [recentVoices, setRecentVoices] = useState<number[]>([])
  const [showProgressBar, setShowProgressBar] = useState(true)
  const [autoSelectVoice, setAutoSelectVoice] = useState(false)
  const [showFirstRun, setShowFirstRun] = useState(false)
  const [expandedSection, setExpandedSection] = useState<SettingsSectionType>('voice')

  useEffect(() => {
    // Check if first run
    browser.storage.local.get(['hasSeenWelcome']).then((result) => {
      if (!result.hasSeenWelcome) {
        setShowFirstRun(true)
      }
    }).catch((error) => {
      console.error('Failed to check first run status:', error)
    })
    
    // Initialize locale first
    initializeLocale().then(locale => {
      setCurrentLocale(locale)
      setLocaleReady(true)
    })
  }, [])

  useEffect(() => {
    if (!localeReady || voices.length === 0) return

    // Load saved default voice settings and recent voices
    browser.storage.local.get(['defaultVoiceIndex', 'recentVoices', 'showProgressBar', 'autoSelectVoice', 'autoSelectedVoice']).then((result) => {
      const autoSelectedVoice = result.autoSelectedVoice as number | undefined
      const defaultVoiceIndex = result.defaultVoiceIndex as number | undefined
      const recentVoices = result.recentVoices as number[] | undefined
      const showProgressBar = result.showProgressBar as boolean | undefined
      const autoSelectVoice = result.autoSelectVoice as boolean | undefined

      // If auto-select is enabled and we have an auto-selected voice, use that
      if (autoSelectVoice && autoSelectedVoice !== undefined && voices[autoSelectedVoice]) {
        setSelectedVoice(autoSelectedVoice)
      } else if (defaultVoiceIndex !== undefined && voices[defaultVoiceIndex]) {
        setSelectedVoice(defaultVoiceIndex)
      }
      if (recentVoices) {
        setRecentVoices(recentVoices)
      }
      if (showProgressBar !== undefined) {
        setShowProgressBar(showProgressBar)
      }
      if (autoSelectVoice !== undefined) {
        setAutoSelectVoice(autoSelectVoice)
      }
    }).catch((error) => {
      console.error('Failed to load voice settings:', error)
    })
  }, [localeReady, voices])

  // Listen for auto-selected voice changes
  useEffect(() => {
    const handleStorageChange = (changes: Record<string, browser.Storage.StorageChange>) => {
      if (changes.autoSelectedVoice) {
        const newVoiceIndex = changes.autoSelectedVoice.newValue as number | undefined
        if (newVoiceIndex !== undefined) {
          setSelectedVoice(newVoiceIndex)
        }
      }
    }

    browser.storage.local.onChanged.addListener(handleStorageChange)

    return () => {
      browser.storage.local.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const saveAsDefault = () => {
    browser.storage.local.set({
      defaultVoiceIndex: selectedVoice,
    })

    // Update recent voices
    const updated = [
      selectedVoice,
      ...recentVoices.filter((v) => v !== selectedVoice),
    ].slice(0, UI_CONFIG.RECENT_VOICES_LIMIT)
    setRecentVoices(updated)
    browser.storage.local.set({ recentVoices: updated })

    // Visual feedback
    const button = document.querySelector('#save-default-btn')
    if (button) {
      const originalText = button.textContent
      button.textContent = t('saved')
      setTimeout(() => {
        button.textContent = originalText
      }, UI_CONFIG.SAVE_FEEDBACK_DURATION)
    }
  }

  const testVoice = () => {
    const voice = voices[selectedVoice]
    if (!voice) return

    const utterance = new SpeechSynthesisUtterance('Hello! This is a voice preview.')
    utterance.voice = voice
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleLanguageChange = async (locale: string) => {
    await setLocale(locale)
    setCurrentLocale(locale)
    // Force re-render
    window.location.reload()
  }

  const closeWelcome = () => {
    setShowFirstRun(false)
    browser.storage.local.set({ hasSeenWelcome: true })
  }

  const toggleSection = (section: SettingsSectionType) => {
    setExpandedSection(expandedSection === section ? '' : section)
  }

  if (!localeReady) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-[500px] p-6 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-3"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-[500px] p-6 transition-colors duration-300">
      <div className="max-w-md mx-auto">
        {/* First Run Welcome */}
        <WelcomeModal isOpen={showFirstRun} onClose={closeWelcome} />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 relative group">
            {logoUrl ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <img src={logoUrl} alt="Read It For Me" className="relative w-16 h-16 rounded-2xl shadow-2xl ring-2 ring-white/50 dark:ring-gray-700/50 group-hover:scale-110 transition-transform duration-300" />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-2xl flex items-center justify-center ring-2 ring-white/50 dark:ring-gray-700/50 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
            {t('readItForMe')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">{t('selectTextPrompt')}</p>
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <ThemeToggle theme={theme} onThemeChange={setTheme} />
          </div>
          
          {/* Help Button */}
          <button
            onClick={() => setShowFirstRun(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary dark:text-primary-light hover:text-white dark:hover:text-white hover:bg-gradient-to-r hover:from-primary hover:to-secondary bg-indigo-50 dark:bg-indigo-900/30 hover:shadow-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-primary/20 dark:border-primary/30"
            title="Show welcome guide"
            aria-label="Show welcome guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('help')}
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/60 mb-4 overflow-hidden hover:shadow-3xl transition-shadow duration-300">
          {/* Language Selection - Always Visible */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('language')}
            </label>
            <select
              className="w-full p-3.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium shadow-sm hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer"
              value={currentLocale}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {availableLocales.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {t(locale.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Settings - Collapsible */}
          <SettingsSection
            id="voice-settings"
            title={t('voice')}
            icon={
              <svg
                className="w-4 h-4 text-primary dark:text-primary-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            }
            isExpanded={expandedSection === 'voice'}
            onToggle={() => toggleSection('voice')}
          >
            <VoiceSelector
              voices={voices}
              selectedVoice={selectedVoice}
              recentVoices={recentVoices}
              isLoading={isLoadingVoices}
              onVoiceChange={setSelectedVoice}
              onTest={testVoice}
            />

            <button
              id="save-default-btn"
              onClick={saveAsDefault}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white text-sm font-bold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 relative overflow-hidden group"
              aria-label="Save current voice as default"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {t('saveAsDefault')}
              </span>
            </button>
          </SettingsSection>

          {/* Playback Settings - Collapsible */}
          <SettingsSection
            id="playback-settings"
            title={t('playback')}
            icon={
              <svg
                className="w-4 h-4 text-primary dark:text-primary-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            }
            isExpanded={expandedSection === 'playback'}
            onToggle={() => toggleSection('playback')}
          >
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {t('showProgressBar')}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showProgressBar}
                  onChange={(e) => {
                    const value = e.target.checked
                    setShowProgressBar(value)
                    browser.storage.local.set({ showProgressBar: value })
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-indigo-600"></div>
              </div>
            </label>
          </SettingsSection>

          {/* Advanced Settings - Collapsible */}
          <SettingsSection
            id="advanced-settings"
            title={t('advanced')}
            icon={
              <svg
                className="w-4 h-4 text-primary dark:text-primary-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            isExpanded={expandedSection === 'advanced'}
            onToggle={() => toggleSection('advanced')}
          >
            <div>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                  {t('autoDetectLanguage')}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoSelectVoice}
                    onChange={(e) => {
                      const value = e.target.checked
                      setAutoSelectVoice(value)
                      browser.storage.local.set({ autoSelectVoice: value })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-indigo-600"></div>
                </div>
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
                {t('autoDetectLanguageDesc')}
              </p>
            </div>
          </SettingsSection>
        </div>

        {/* Buy Me a Coffee Link */}
        <div className="text-center mb-4">
          <a
            href="https://buymeacoffee.com/jorge.mendesdev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 text-sm font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-md"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
            </svg>
            {t('buyMeACoffee')}
          </a>
        </div>

        {/* Developer Credit */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            {t('developedBy')}{' '}
            <a
              href="https://jorgemendes.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary font-medium hover:underline transition-colors duration-200"
            >
              Jorge Mendes
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default App


