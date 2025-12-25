import { useState, useEffect } from 'react'
import { t, initializeLocale, setLocale, availableLocales } from '../utils/i18n'

function App() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<number>(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)
  const [currentLocale, setCurrentLocale] = useState('en')
  const [localeReady, setLocaleReady] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [recentVoices, setRecentVoices] = useState<number[]>([])
  const [showProgressBar, setShowProgressBar] = useState(true)

  useEffect(() => {
    // Get the proper URL for the logo
    setLogoUrl(chrome.runtime.getURL('icons/icon128.png'))
    
    // Initialize locale first
    initializeLocale().then(locale => {
      setCurrentLocale(locale)
      setLocaleReady(true)
    })
  }, [])

  useEffect(() => {
    if (!localeReady) return

    // Get available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
      
      // Load saved default voice settings and recent voices
      chrome.storage.local.get(['defaultVoiceIndex', 'recentVoices', 'showProgressBar'], (result) => {
        if (result.defaultVoiceIndex !== undefined && availableVoices[result.defaultVoiceIndex]) {
          setSelectedVoice(result.defaultVoiceIndex)
        }
        if (result.recentVoices) {
          setRecentVoices(result.recentVoices)
        }
        if (result.showProgressBar !== undefined) {
          setShowProgressBar(result.showProgressBar)
        }
      })
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [localeReady])



  const saveAsDefault = () => {
    chrome.storage.local.set({
      defaultVoiceIndex: selectedVoice
    })
    
    // Update recent voices
    const updated = [selectedVoice, ...recentVoices.filter(v => v !== selectedVoice)].slice(0, 5)
    setRecentVoices(updated)
    chrome.storage.local.set({ recentVoices: updated })
    
    // Visual feedback
    const button = document.querySelector('#save-default-btn')
    if (button) {
      const originalText = button.textContent
      button.textContent = t('saved')
      setTimeout(() => {
        button.textContent = originalText
      }, 2000)
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

  if (!localeReady) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-[500px] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-3"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-[500px] p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Read It For Me" className="w-14 h-14 rounded-2xl shadow-lg" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {t('readItForMe')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{t('selectTextPrompt')}</p>
        </div>

        {/* Voice Settings Card - Collapsible */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-4 overflow-hidden">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-white/60 transition-colors"
          >
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {t('voiceSettings')}
            </h2>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isSettingsOpen && (
            <div className="p-5 pt-0 space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  {t('language')}
                </label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-sm"
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

              {/* Voice Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    {t('voice')}
                  </label>
                  <button
                    onClick={testVoice}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
                  >
                    🔊 Test
                  </button>
                </div>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-sm"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(Number(e.target.value))}
                >
                  {recentVoices.length > 0 && (
                    <optgroup label="⭐ Recent">
                      {recentVoices.map(idx => {
                        const voice = voices[idx]
                        if (!voice) return null
                        return (
                          <option key={`recent-${idx}`} value={idx}>
                            {voice.name}
                          </option>
                        )
                      })}
                    </optgroup>
                  )}
                  {(() => {
                    // Group voices by language
                    const voicesByLang: { [key: string]: { voice: SpeechSynthesisVoice; index: number }[] } = {}
                    
                    voices.forEach((voice, index) => {
                      const lang = voice.lang
                      if (!voicesByLang[lang]) {
                        voicesByLang[lang] = []
                      }
                      voicesByLang[lang].push({ voice, index })
                    })

                    // Sort languages alphabetically
                    const sortedLangs = Object.keys(voicesByLang).sort()

                    return sortedLangs.map(lang => (
                      <optgroup key={lang} label={lang}>
                        {voicesByLang[lang].map(({ voice, index }) => (
                          <option key={index} value={index}>
                            {voice.name}
                            {voice.name.toLowerCase().includes('neural') ? ' ⚡' : ''}
                            {voice.name.toLowerCase().includes('premium') ? ' ⭐' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  })()}
                </select>
              </div>

              {/* Progress Bar Toggle */}
              <div>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                        chrome.storage.local.set({ showProgressBar: value })
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                </label>
              </div>

              {/* Save Default Voice Button */}
              <button
                id="save-default-btn"
                onClick={saveAsDefault}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('saveAsDefault')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
