import { useState, useEffect } from 'react'

function App() {
  const [selectedText, setSelectedText] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<number>(0)
  const [rate, setRate] = useState(0.9) // Slightly slower for more natural sound
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [detectedLanguage, setDetectedLanguage] = useState<string>('')
  const [_currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)

  useEffect(() => {
    // Get available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
      
      // Load saved default voice settings
      chrome.storage.local.get(['defaultVoiceIndex', 'defaultRate', 'defaultPitch', 'defaultVolume'], (result) => {
        if (result.defaultVoiceIndex !== undefined && availableVoices[result.defaultVoiceIndex]) {
          setSelectedVoice(result.defaultVoiceIndex)
        }
        if (result.defaultRate !== undefined) setRate(result.defaultRate)
        if (result.defaultPitch !== undefined) setPitch(result.defaultPitch)
        if (result.defaultVolume !== undefined) setVolume(result.defaultVolume)
        setDefaultsLoaded(true)
      })
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    // Get selected text from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getSelectedText' },
          (response) => {
            if (response?.text) {
              setSelectedText(response.text)
            }
            if (response?.language) {
              setDetectedLanguage(response.language)
            }
          }
        )
      }
    })
  }, [])

  // Auto-select best voice when language is detected or voices change (only if no defaults saved)
  useEffect(() => {
    if (voices.length > 0 && detectedLanguage && defaultsLoaded) {
      // Only auto-select if user hasn't manually chosen a default voice
      chrome.storage.local.get(['defaultVoiceIndex'], (result) => {
        if (result.defaultVoiceIndex === undefined) {
          const bestVoice = findBestVoice(voices, detectedLanguage)
          if (bestVoice !== -1) {
            setSelectedVoice(bestVoice)
          }
        }
      })
    }
  }, [voices, detectedLanguage, defaultsLoaded])

  const saveAsDefault = () => {
    chrome.storage.local.set({
      defaultVoiceIndex: selectedVoice,
      defaultRate: rate,
      defaultPitch: pitch,
      defaultVolume: volume
    })
    // Visual feedback
    const button = document.querySelector('#save-default-btn')
    if (button) {
      const originalText = button.textContent
      button.textContent = '✓ Saved!'
      setTimeout(() => {
        button.textContent = originalText
      }, 2000)
    }
  }

  // Function to find the best voice for a given language
  const findBestVoice = (availableVoices: SpeechSynthesisVoice[], language: string): number => {
    // Extract language code (e.g., 'en' from 'en-US')
    const langCode = language.split('-')[0].toLowerCase()
    
    // Filter voices that match the language
    const matchingVoices = availableVoices
      .map((voice, index) => ({ voice, index }))
      .filter(({ voice }) => voice.lang.toLowerCase().startsWith(langCode))
    
    if (matchingVoices.length === 0) return -1
    
    // Rank voices by quality (prioritize neural, premium, Google voices)
    const rankedVoices = matchingVoices.sort((a, b) => {
      const aName = a.voice.name.toLowerCase()
      const bName = b.voice.name.toLowerCase()
      
      // Priority scoring
      const getScore = (name: string, voice: SpeechSynthesisVoice) => {
        let score = 0
        if (name.includes('neural')) score += 100
        if (name.includes('premium')) score += 80
        if (name.includes('google')) score += 60
        if (name.includes('natural')) score += 50
        if (name.includes('enhanced')) score += 40
        if (voice.localService === false) score += 30 // Cloud voices often better
        if (name.includes('wavenet')) score += 90
        if (name.includes('studio')) score += 85
        if (name.includes('journey')) score += 85
        if (name.includes('polyglot')) score += 70
        return score
      }
      
      return getScore(bName, b.voice) - getScore(aName, a.voice)
    })
    
    return rankedVoices[0].index
  }

  // Detect language from text (fallback)
  const detectLanguageFromText = (text: string): string => {
    // Simple heuristic-based detection
    const chineseRegex = /[\u4e00-\u9fa5]/
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/
    const koreanRegex = /[\uac00-\ud7af]/
    const arabicRegex = /[\u0600-\u06ff]/
    const cyrillicRegex = /[\u0400-\u04ff]/
    
    if (chineseRegex.test(text)) return 'zh-CN'
    if (japaneseRegex.test(text)) return 'ja-JP'
    if (koreanRegex.test(text)) return 'ko-KR'
    if (arabicRegex.test(text)) return 'ar-SA'
    if (cyrillicRegex.test(text)) return 'ru-RU'
    
    return 'en-US' // Default to English
  }

  // Update detected language when text changes
  useEffect(() => {
    if (selectedText && !detectedLanguage) {
      const detected = detectLanguageFromText(selectedText)
      setDetectedLanguage(detected)
    }
  }, [selectedText, detectedLanguage])

  // Listen for state updates from background
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'stateUpdate') {
        setIsReading(message.state.isReading)
        setIsPaused(message.state.isPaused)
      }
    }
    
    chrome.runtime.onMessage.addListener(messageListener)
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const handleReadText = () => {
    if (!selectedText) return

    if (isReading) {
      if (isPaused) {
        // Send resume command to background
        chrome.runtime.sendMessage({ action: 'resumeReading' })
        setIsPaused(false)
      } else {
        // Send pause command to background
        chrome.runtime.sendMessage({ action: 'pauseReading' })
        setIsPaused(true)
      }
      return
    }

    // Send start reading command to background/content script
    chrome.runtime.sendMessage({
      action: 'startReading',
      text: selectedText,
      voiceIndex: selectedVoice,
      rate,
      pitch,
      volume
    }, (response) => {
      if (response?.success) {
        setIsReading(true)
        setIsPaused(false)
      }
    })
  }

  const handleStop = () => {
    // Send stop command to background
    chrome.runtime.sendMessage({ action: 'stopReading' })
    setIsReading(false)
    setIsPaused(false)
    setCurrentUtterance(null)
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-[500px] p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Read It For Me
          </h1>
          <p className="text-sm text-gray-600 mt-1">Natural speech for any web content</p>
        </div>

        {/* Text Input Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 mb-4 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Your Text
            </label>
            <span className="text-xs text-gray-500 font-medium">
              {selectedText.length} characters
            </span>
          </div>
          <textarea
            className="w-full h-36 p-3 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            placeholder="Select text on the webpage or type here..."
          />
          {isReading && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-indigo-600 rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-purple-600 rounded-full animate-pulse delay-75"></div>
                <div className="w-1 h-4 bg-pink-600 rounded-full animate-pulse delay-150"></div>
              </div>
              <span className="text-indigo-600 font-medium">
                {isPaused ? 'Paused' : 'Reading...'}
              </span>
            </div>
          )}
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
              Voice Settings
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
              {/* Voice Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Voice
                  </label>
                  {detectedLanguage && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      {detectedLanguage.split('-')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-sm"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(Number(e.target.value))}
                >
                  {voices.map((voice, index) => (
                    <option key={index} value={index}>
                      {voice.name} ({voice.lang})
                      {voice.name.toLowerCase().includes('neural') ? ' ⚡' : ''}
                      {voice.name.toLowerCase().includes('premium') ? ' ⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Control */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Speed
                  </label>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    {rate.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Pitch Control */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Pitch
                  </label>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                    {pitch.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Volume Control */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    Volume
                  </label>
                  <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-1 rounded-lg">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Save Default Button */}
              <button
                id="save-default-btn"
                onClick={saveAsDefault}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save as Default
              </button>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleReadText}
            disabled={!selectedText}
            className={`flex-1 py-3.5 px-4 rounded-xl font-semibold text-white transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
              !selectedText
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : isReading && !isPaused
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isReading && !isPaused ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </>
            ) : isReading && isPaused ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Read Text
              </>
            )}
          </button>
          
          {isReading && (
            <button
              onClick={handleStop}
              className="px-5 py-3.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select text on any webpage and click the extension icon
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
