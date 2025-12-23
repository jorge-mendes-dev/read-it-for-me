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

  useEffect(() => {
    // Get available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
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

  // Auto-select best voice when language is detected or voices change
  useEffect(() => {
    if (voices.length > 0 && detectedLanguage) {
      const bestVoice = findBestVoice(voices, detectedLanguage)
      if (bestVoice !== -1) {
        setSelectedVoice(bestVoice)
      }
    }
  }, [voices, detectedLanguage])

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

  // Preprocess text for more natural speech
  const preprocessText = (text: string): string => {
    let processed = text

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim()

    // Handle parenthetical expressions with slight pauses
    processed = processed.replace(/\(([^)]+)\)/g, ', $1,')
    processed = processed.replace(/\[([^\]]+)\]/g, ', $1,')
    
    // Handle quotes more naturally
    processed = processed.replace(/"([^"]+)"/g, ', quote, $1, unquote,')
    processed = processed.replace(/'([^']+)'/g, ', $1,')

    // Handle common abbreviations (expanded list)
    processed = processed.replace(/\bDr\./gi, 'Doctor')
    processed = processed.replace(/\bMr\./g, 'Mister')
    processed = processed.replace(/\bMrs\./g, 'Misses')
    processed = processed.replace(/\bMs\./g, 'Miss')
    processed = processed.replace(/\bProf\./gi, 'Professor')
    processed = processed.replace(/\bSt\./g, 'Saint')
    processed = processed.replace(/\bAve\./g, 'Avenue')
    processed = processed.replace(/\bBlvd\./g, 'Boulevard')
    processed = processed.replace(/\bRd\./g, 'Road')
    processed = processed.replace(/\betc\./gi, 'etcetera')
    processed = processed.replace(/\be\.g\./gi, 'for example')
    processed = processed.replace(/\bi\.e\./gi, 'that is')
    processed = processed.replace(/\bvs\./gi, 'versus')
    processed = processed.replace(/\betc\b/gi, 'etcetera')
    processed = processed.replace(/\baka\b/gi, 'also known as')
    processed = processed.replace(/\bFYI\b/gi, 'for your information')
    processed = processed.replace(/\bASAP\b/gi, 'as soon as possible')

    // Handle time formats
    processed = processed.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi, '$1 $2 $3')
    processed = processed.replace(/(\d{1,2}):(\d{2})/g, '$1 $2')

    // Handle dates more naturally
    processed = processed.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, '$1 $2 $3')
    
    // Handle ordinal numbers
    processed = processed.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1$2')

    // Handle percentages with pause
    processed = processed.replace(/(\d+)%/g, '$1 percent')
    
    // Handle dollar amounts
    processed = processed.replace(/\$(\d+)/g, '$1 dollars')
    processed = processed.replace(/(\d+) dollars\.(\d+)/g, '$1 dollars and $2 cents')

    // Handle numbers with commas (for thousands)
    processed = processed.replace(/(\d+),(\d{3})/g, '$1$2')
    
    // Handle dashes and hyphens with slight pause
    processed = processed.replace(/\s*--\s*/g, ', ')
    processed = processed.replace(/\s*—\s*/g, ', ')
    
    // Add natural pauses after punctuation
    processed = processed.replace(/\.\s+/g, '. ')
    processed = processed.replace(/\?\s+/g, '? ')
    processed = processed.replace(/!\s+/g, '! ')
    processed = processed.replace(/,\s*/g, ', ')
    processed = processed.replace(/;\s*/g, '; ')
    processed = processed.replace(/:\s*/g, ': ')

    // Clean up URLs and emails
    processed = processed.replace(/https?:\/\/[^\s]+/g, ' ')
    processed = processed.replace(/www\.[^\s]+/g, ' ')
    processed = processed.replace(/[\w.-]+@[\w.-]+\.\w+/g, ' email address ')

    // Remove excessive punctuation
    processed = processed.replace(/\.{2,}/g, ',')
    processed = processed.replace(/!{2,}/g, '!')
    processed = processed.replace(/\?{2,}/g, '?')
    
    // Remove markdown and special formatting symbols
    processed = processed.replace(/[*_#`~\[\]]/g, '')
    processed = processed.replace(/^\s*[-•]\s*/gm, '') // Remove bullet points
    
    // Handle all caps (usually acronyms or emphasis)
    processed = processed.replace(/\b([A-Z]{2,})\b/g, (match) => {
      if (match.length <= 4) {
        // Likely an acronym, space out letters
        return match.split('').join('. ')
      }
      return match.toLowerCase()
    })

    // Clean up multiple spaces and extra commas
    processed = processed.replace(/\s+/g, ' ')
    processed = processed.replace(/,\s*,+/g, ',')
    processed = processed.replace(/\s*,\s*/g, ', ')

    return processed.trim()
  }

  const handleReadText = () => {
    if (!selectedText) return

    if (isReading) {
      if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
      } else {
        window.speechSynthesis.pause()
        setIsPaused(true)
      }
      return
    }

    // Preprocess text for more natural speech
    const processedText = preprocessText(selectedText)
    
    // Split into sentences for better pacing (optional chunking for very long text)
    const sentences = processedText.match(/[^.!?]+[.!?]+/g) || [processedText]
    
    // For now, read all at once but with processed text
    // Future: could implement sentence-by-sentence with pauses
    const finalText = sentences.join(' ')
    
    const utterance = new SpeechSynthesisUtterance(finalText)
    
    if (voices[selectedVoice]) {
      utterance.voice = voices[selectedVoice]
    }
    
    // Slightly varied rate for more natural sound (0.85-0.95 range)
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    // Add natural-sounding boundary events for emphasis
    utterance.onboundary = (_event) => {
      // This fires at word boundaries, can be used for real-time highlighting
      // Currently just helps with natural flow
    }

    utterance.onend = () => {
      setIsReading(false)
      setIsPaused(false)
      setCurrentUtterance(null)
    }

    utterance.onerror = () => {
      setIsReading(false)
      setIsPaused(false)
      setCurrentUtterance(null)
    }

    setCurrentUtterance(utterance)
    window.speechSynthesis.speak(utterance)
    setIsReading(true)
    setIsPaused(false)
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
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

        {/* Voice Settings Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 mb-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Voice Settings
          </h2>

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
