// Content script that runs on all web pages
// Handles text selection and speech synthesis
import browser from '../utils/browser'
import { showPlayer, hidePlayer, updatePlayerState, updateQueueCount, updateProgress, updateTimeEstimate } from './floatingPlayer'
import type { ReadingRequest } from '../types'

let currentUtterance: SpeechSynthesisUtterance | null = null
let isReading = false
let isPaused = false
let currentMessages: any = {}
let progressInterval: number | null = null
let startTime = 0

// Ensure voices are loaded
function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = window.speechSynthesis.getVoices()
        resolve(loadedVoices)
      }
    }
  })
}

// Queue system for reading requests
let readingQueue: ReadingRequest[] = []

// Function to process next item in queue
function processNextInQueue() {
  if (readingQueue.length === 0) {
    isReading = false
    isPaused = false
    currentUtterance = null
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    hidePlayer()
    updateState()
    return
  }
  
  updateQueueCount(readingQueue.length)
  const request = readingQueue.shift()!
  startReading(request.text, request.voiceIndex, request.rate, request.pitch, request.volume)
}

// Function to start reading (used by both queue and direct calls)
function startReading(text: string, voiceIndex: number | undefined, rate: number, pitch: number, volume: number) {
  const processedText = preprocessText(text)
  const utterance = new SpeechSynthesisUtterance(processedText)
  
  // Calculate estimated time
  const wordsPerMinute = 150 * (rate || 1) // Average speaking rate
  const words = processedText.split(/\s+/).length
  const estimatedSeconds = (words / wordsPerMinute) * 60
  updateTimeEstimate(estimatedSeconds)
  
  const voices = window.speechSynthesis.getVoices()
  
  // Safety check: if no voices available, log error and return early
  if (voices.length === 0) {
    console.error('No speech synthesis voices available')
    processNextInQueue()
    return
  }
  
  if (voiceIndex !== undefined && voices[voiceIndex]) {
    utterance.voice = voices[voiceIndex]
  } else {
    // Fallback to auto-detection if no voice specified
    const detectedLanguage = detectLanguageFromText(text)
    const bestVoice = getBestVoiceForLanguage(detectedLanguage)
    if (bestVoice) {
      utterance.voice = bestVoice
    } else {
      utterance.voice = voices[0]
    }
  }
  
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = volume

  // Word boundary tracking for potential highlighting (basic implementation)
  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name === 'word') {
      // Store current word position for future highlighting feature
      // This can be expanded to actually highlight words in the page
      console.debug('Word boundary at char:', event.charIndex)
    }
  }

  // Track progress
  startTime = Date.now()
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  progressInterval = window.setInterval(() => {
    if (!isReading || isPaused) return
    const elapsed = (Date.now() - startTime) / 1000
    const estimated = estimatedSeconds
    // Prevent progress from exceeding 100%
    const cappedElapsed = Math.min(elapsed, estimated)
    updateProgress(cappedElapsed, estimated)
  }, 100)

  utterance.onend = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    updateProgress(100, 100)
    processNextInQueue()
  }

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    console.error('Speech synthesis error:', event.error, event)
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    processNextInQueue()
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
  isReading = true
  isPaused = false
  updateState()
  updateQueueCount(readingQueue.length)
  showPlayer().catch(console.error)
}

// Load messages for selected locale
async function loadLocaleMessages(): Promise<void> {
  try {
    const result = await browser.storage.local.get(['selectedLocale'])
    const locale = (result.selectedLocale as string | undefined) || 'en'
    
    try {
      const url = browser.runtime.getURL(`_locales/${locale}/messages.json`)
      const response = await fetch(url)
      currentMessages = await response.json()
    } catch (error) {
      console.error('[ContentScript] Failed to load locale:', locale, error)
      // Try loading English as absolute fallback
      const fallbackUrl = browser.runtime.getURL('_locales/en/messages.json')
      const fallbackResponse = await fetch(fallbackUrl)
      currentMessages = await fallbackResponse.json()
    }
  } catch (error) {
    console.error('[ContentScript] Failed to load locale messages:', error)
  }
}

// Get translated text
function getMessage(key: string): string {
  if (currentMessages[key]) {
    return currentMessages[key].message
  }
  console.warn(`[ContentScript] Translation missing for key: ${key}`);
  // Fallback values for common keys
  const fallbacks: { [key: string]: string } = {
    'readThis': 'Read This',
    'pause': 'Pause',
    'resume': 'Resume',
    'stop': 'Stop',
    'clearQueue': 'Clear Queue'
  }
  return fallbacks[key] || key
}

// Initialize locale on load
loadLocaleMessages().then(() => {
  // Create tooltip after locale is loaded
  createSelectionTooltip()
  // Ensure tooltip has correct text
  updateTooltipText()
}).catch((error) => {
  console.error('[ContentScript] Failed to load locale, creating tooltip with defaults:', error)
  // Create tooltip anyway with fallback text
  createSelectionTooltip()
})

// Preprocess text for natural speech
function preprocessText(text: string): string {
  let processed = text
  processed = processed.replace(/\s+/g, ' ').trim()
  processed = processed.replace(/\(([^)]+)\)/g, ', $1,')
  processed = processed.replace(/\[([^\]]+)\]/g, ', $1,')
  processed = processed.replace(/"([^"]+)"/g, ', $1,')
  processed = processed.replace(/'([^']+)'/g, '$1')
  
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
  
  processed = processed.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi, '$1 $2 $3')
  processed = processed.replace(/(\d{1,2}):(\d{2})/g, '$1 $2')
  processed = processed.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, '$1 $2 $3')
  processed = processed.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1$2')
  processed = processed.replace(/(\d+),(\d{3})/g, '$1$2')
  processed = processed.replace(/\s*--\s*/g, ', ')
  processed = processed.replace(/\s*—\s*/g, ', ')
  processed = processed.replace(/\.\s+/g, '. ')
  processed = processed.replace(/\?\s+/g, '? ')
  processed = processed.replace(/!\s+/g, '! ')
  processed = processed.replace(/,\s*/g, ', ')
  processed = processed.replace(/;\s*/g, '; ')
  processed = processed.replace(/:\s*/g, ': ')
  processed = processed.replace(/https?:\/\/[^\s]+/g, ' ')
  processed = processed.replace(/www\.[^\s]+/g, ' ')
  processed = processed.replace(/[\w.-]+@[\w.-]+\.\w+/g, ' ')
  processed = processed.replace(/\.{2,}/g, ',')
  processed = processed.replace(/!{2,}/g, '!')
  processed = processed.replace(/\?{2,}/g, '?')
  processed = processed.replace(/[*_#`~[\]]/g, '')
  processed = processed.replace(/^\s*[-•]\s*/gm, '')
  processed = processed.replace(/\b([A-Z]{2,})\b/g, (match) => {
    if (match.length <= 4) {
      return match.split('').join('. ')
    }
    return match.toLowerCase()
  })
  processed = processed.replace(/\s+/g, ' ')
  processed = processed.replace(/,\s*,+/g, ',')
  processed = processed.replace(/\s*,\s*/g, ', ')
  return processed.trim()
}

function updateState() {
  // Send update to background (catch errors if background not ready)
  browser.runtime.sendMessage({
    action: 'stateUpdate',
    state: { isReading, isPaused, currentText: currentUtterance?.text || '' }
  }).catch(err => {
    // Background might not be ready yet, silently ignore
    console.debug('Could not send state update to background:', err.message)
  })
  
  // Also dispatch custom event for floating player in same page
  window.dispatchEvent(new CustomEvent('rifm-state-update', {
    detail: { isReading, isPaused }
  }))
}

browser.runtime.onMessage.addListener((request: any) => {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection()?.toString() || '';
    const pageLang = document.documentElement.lang || 
                     document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                     navigator.language;
    return Promise.resolve({ 
      text: selectedText,
      language: pageLang
    });
  }

  if (request.action === 'startReading') {
    const { text, voiceIndex, rate, pitch, volume } = request
    
    // Add to queue if already reading, otherwise start immediately
    if (isReading && !isPaused) {
      readingQueue.push({ text, voiceIndex, rate, pitch, volume })
      return Promise.resolve({ success: true, queued: true })
    } else {
      // Stop current if paused and start new one
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      readingQueue = [] // Clear queue
      startReading(text, voiceIndex, rate, pitch, volume)
      return Promise.resolve({ success: true, queued: false })
    }
  }

  if (request.action === 'pauseReading') {
    if (isReading && !isPaused) {
      try {
        window.speechSynthesis.pause()
        isPaused = true
        updatePlayerState(true) // Update player immediately
        updateState()
      } catch (error) {
        console.error('Error pausing speech:', error)
      }
    }
    return Promise.resolve({ success: true, isPaused })
  }

  if (request.action === 'resumeReading') {
    if (isReading && isPaused) {
      try {
        window.speechSynthesis.resume()
        isPaused = false
        updatePlayerState(false) // Update player immediately
        updateState()
      } catch (error) {
        console.error('Error resuming speech:', error)
      }
    }
    return Promise.resolve({ success: true, isPaused })
  }

  if (request.action === 'stopReading') {
    window.speechSynthesis.cancel()
    readingQueue = [] // Clear the queue
    isReading = false
    isPaused = false
    currentUtterance = null
    if (progressInterval) clearInterval(progressInterval)
    updateQueueCount(0)
    updateState()
    return Promise.resolve({ success: true })
  }

  if (request.action === 'getState') {
    return Promise.resolve({
      isReading,
      isPaused,
      currentText: currentUtterance?.text || '',
      queueLength: readingQueue.length
    })
  }

  if (request.action === 'clearQueue') {
    readingQueue = []
    updateQueueCount(0)
    return Promise.resolve({ success: true })
  }

  if (request.action === 'updateSettings') {
    // Update current utterance settings in real-time if reading
    if (currentUtterance && isReading) {
      if (request.rate !== undefined) currentUtterance.rate = request.rate
      if (request.pitch !== undefined) currentUtterance.pitch = request.pitch
      if (request.volume !== undefined) currentUtterance.volume = request.volume
    }
    return Promise.resolve({ success: true })
  }

  return Promise.resolve(null)
});

// Listen for custom events from floating player (same context)
window.addEventListener('rifm-action', ((event: CustomEvent) => {
  const { action, ...params } = event.detail
  
  if (action === 'stopReading') {
    window.speechSynthesis.cancel()
    readingQueue = []
    isReading = false
    isPaused = false
    currentUtterance = null
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    updateQueueCount(0)
    updateState()
    hidePlayer()
  }
  
  if (action === 'togglePlayPause') {
    if (isPaused) {
      // Resume
      try {
        window.speechSynthesis.resume()
        isPaused = false
        updatePlayerState(false)
        updateState()
      } catch (error) {
        console.error('Error resuming speech:', error)
      }
    } else if (isReading) {
      // Pause
      try {
        window.speechSynthesis.pause()
        isPaused = true
        updatePlayerState(true)
        updateState()
      } catch (error) {
        console.error('Error pausing speech:', error)
      }
    }
  }
  
  if (action === 'clearQueue') {
    readingQueue = []
    updateQueueCount(0)
  }
  
  if (action === 'updateSettings') {
    // Update current utterance settings in real-time if reading
    if (currentUtterance && isReading) {
      if (params.rate !== undefined) currentUtterance.rate = params.rate
      if (params.pitch !== undefined) currentUtterance.pitch = params.pitch
      if (params.volume !== undefined) currentUtterance.volume = params.volume
    }
  }
}) as EventListener)

// Selection Tooltip Button
let selectionTooltip: HTMLDivElement | null = null
let tooltipHideTimeout: number | null = null

function createSelectionTooltip() {
  if (selectionTooltip) return

  selectionTooltip = document.createElement('div')
  selectionTooltip.id = 'rifm-selection-tooltip'
  selectionTooltip.innerHTML = `
    <style>
      #rifm-selection-tooltip {
        position: fixed !important;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 20px !important;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        z-index: 2147483646 !important;
        display: none !important;
        align-items: center !important;
        gap: 6px !important;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        user-select: none !important;
        backdrop-filter: blur(10px) !important;
        white-space: nowrap !important;
        opacity: 0 !important;
        transform: translateY(-8px) scale(0.9) !important;
      }

      @media (prefers-color-scheme: dark) {
        #rifm-selection-tooltip {
          background: linear-gradient(135deg, #4f52dd 0%, #7748e2 100%) !important;
          box-shadow: 0 4px 12px rgba(79, 82, 221, 0.5) !important;
        }
      }

      #rifm-selection-tooltip:hover {
        transform: translateY(0) scale(1.08) !important;
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.6) !important;
      }

      #rifm-selection-tooltip:active {
        transform: translateY(0) scale(0.98) !important;
      }

      #rifm-selection-tooltip.show {
        display: flex !important;
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      #rifm-selection-tooltip svg {
        width: 16px !important;
        height: 16px !important;
        fill: white !important;
        animation: tooltipIconPulse 2s ease-in-out infinite !important;
      }

      @keyframes tooltipIconPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
    </style>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
    </svg>
    <span id="rifm-tooltip-text">${getMessage('readThis')}</span>
  `

  selectionTooltip.addEventListener('click', handleSelectionRead)
  document.body.appendChild(selectionTooltip)
}

function updateTooltipText() {
  if (!selectionTooltip) return
  const textSpan = selectionTooltip.querySelector('#rifm-tooltip-text')
  if (textSpan) {
    textSpan.textContent = getMessage('readThis')
  }
}

function showSelectionTooltip() {
  if (!selectionTooltip) return // Don't auto-create, wait for locale to load

  updateTooltipText()
  
  // Get the current selection
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  
  // Tooltip dimensions
  const tooltipWidth = 150
  const tooltipHeight = 40
  const margin = 5 // Reduced margin for closer positioning
  
  // Calculate position centered above the selection
  let finalX = rect.left + (rect.width / 2) - (tooltipWidth / 2)
  let finalY = rect.top - tooltipHeight - margin
  
  // Adjust horizontal position if too close to edges
  if (finalX + tooltipWidth > window.innerWidth - margin) {
    finalX = window.innerWidth - tooltipWidth - margin
  }
  if (finalX < margin) {
    finalX = margin
  }
  
  // If too close to top, show below selection instead
  if (finalY < margin) {
    finalY = rect.bottom + margin
  }
  
  // Ensure tooltip stays within viewport vertically
  if (finalY + tooltipHeight > window.innerHeight - margin) {
    finalY = window.innerHeight - tooltipHeight - margin
  }
  
  // Position tooltip
  selectionTooltip.style.left = `${finalX}px`
  selectionTooltip.style.top = `${finalY}px`
  selectionTooltip.classList.add('show')
}

function hideSelectionTooltip() {
  if (!selectionTooltip) return
  
  // Clear any existing timeout to prevent multiple hide attempts
  if (tooltipHideTimeout !== null) {
    clearTimeout(tooltipHideTimeout)
  }
  
  // Trigger exit animation before hiding
  selectionTooltip.style.opacity = '0'
  selectionTooltip.style.transform = 'translateY(-8px) scale(0.9)'
  tooltipHideTimeout = window.setTimeout(() => {
    selectionTooltip?.classList.remove('show')
    tooltipHideTimeout = null
  }, 300) // Match transition duration
}

// Detect language from text
function detectLanguageFromText(text: string): string {
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

// Get best voice for detected language
function getBestVoiceForLanguage(language: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const langCode = language.split('-')[0].toLowerCase()
  
  // Find voices matching the language
  const matchingVoices = voices.filter(voice => 
    voice.lang.toLowerCase().startsWith(langCode)
  )
  
  if (matchingVoices.length === 0) return null
  
  // Prefer premium/high-quality voices
  const premiumVoice = matchingVoices.find(v => 
    v.name.includes('Premium') || 
    v.name.includes('Enhanced') ||
    v.name.includes('Neural') ||
    !v.name.includes('Google')
  )
  
  return premiumVoice || matchingVoices[0]
}

function handleSelectionRead() {
  const selectedText = window.getSelection()?.toString()
  if (!selectedText) return

  hideSelectionTooltip()

  // Get page language from various sources
  const getPageLanguage = (): string => {
    // Try document lang attribute first
    const htmlLang = document.documentElement.lang
    if (htmlLang) return htmlLang
    
    // Try meta content-language
    const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content')
    if (metaLang) return metaLang
    
    // Try meta language
    const metaLang2 = document.querySelector('meta[name="language"]')?.getAttribute('content')
    if (metaLang2) return metaLang2
    
    // Fallback to text detection
    return detectLanguageFromText(selectedText)
  }

  // Get saved voice settings
  browser.storage.local.get(['defaultVoiceIndex', 'defaultRate', 'defaultPitch', 'defaultVolume', 'autoSelectVoice']).then(async (result) => {
    let voiceIndex = result.defaultVoiceIndex as number | undefined
    const rate = (result.defaultRate as number | undefined) ?? 0.9
    const pitch = (result.defaultPitch as number | undefined) ?? 1
    const volume = (result.defaultVolume as number | undefined) ?? 1
    const autoSelect = (result.autoSelectVoice as boolean | undefined) ?? false

    // Auto-select voice based on page language if enabled
    if (autoSelect) {
      // Wait for voices to be loaded
      const voices = await ensureVoicesLoaded()
      const pageLang = getPageLanguage()
      const langCode = pageLang.split('-')[0].toLowerCase()
      const fullLangCode = pageLang.toLowerCase()
      
      // Find matching voices for page language
      const matchingVoices = voices.filter(voice => {
        const voiceLang = voice.lang.toLowerCase()
        return voiceLang.startsWith(langCode) || 
               voiceLang === fullLangCode ||
               voiceLang.startsWith(fullLangCode)
      })
      
      if (matchingVoices.length > 0) {
        // Score each voice based on quality indicators
        const scoreVoice = (voice: SpeechSynthesisVoice): number => {
          let score = 0
          const name = voice.name.toLowerCase()
          const lang = voice.lang.toLowerCase()
          
          // Exact language match bonus
          if (lang === fullLangCode) score += 50
          else if (lang.startsWith(fullLangCode)) score += 30
          
          // Premium quality indicators
          if (name.includes('neural')) score += 100
          if (name.includes('premium')) score += 90
          if (name.includes('enhanced')) score += 80
          if (name.includes('natural')) score += 70
          
          // Prefer Microsoft/Edge voices (usually higher quality)
          if (name.includes('microsoft')) score += 40
          if (name.includes('edge')) score += 40
          
          // Google voices are generally good
          if (name.includes('google')) score += 30
          
          // Avoid robotic/poor quality voices
          if (name.includes('espeak')) score -= 50
          if (name.includes('festival')) score -= 50
          
          // Prefer local voices (usually faster and more reliable)
          if (voice.localService) score += 20
          
          // Female voices often sound more natural
          if (name.includes('female') || name.includes('aria') || name.includes('zira') || 
              name.includes('heera') || name.includes('susan') || name.includes('samantha')) {
            score += 15
          }
          
          return score
        }
        
        // Sort voices by score and pick the best
        const rankedVoices = matchingVoices
          .map(voice => ({ voice, score: scoreVoice(voice) }))
          .sort((a, b) => b.score - a.score)
        
        const bestVoice = rankedVoices[0].voice
        voiceIndex = voices.indexOf(bestVoice)
        
        // Save the auto-selected voice so the popup can update
        browser.storage.local.set({ autoSelectedVoice: voiceIndex })
      }
    }

    // Add to queue if already reading, otherwise start immediately
    if (isReading && !isPaused) {
      readingQueue.push({ text: selectedText, voiceIndex, rate, pitch, volume })
    } else {
      // Stop current if paused and start new one
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      readingQueue = [] // Clear queue
      startReading(selectedText, voiceIndex, rate, pitch, volume)
    }
  }).catch((error) => {
    console.error('Failed to load voice settings for reading:', error)
    // Fallback: start reading with default settings
    startReading(selectedText, undefined, 0.9, 1, 1)
  })
}

// Store selected text and show tooltip
document.addEventListener('mouseup', () => {
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString()
    
    if (selectedText && selectedText.trim().length > 0) {
      browser.storage.local.set({ lastSelectedText: selectedText })
      showSelectionTooltip()
    } else {
      hideSelectionTooltip()
    }
  }, 10)
})

// Hide tooltip when clicking elsewhere
document.addEventListener('mousedown', (e: MouseEvent) => {
  if (selectionTooltip && !selectionTooltip.contains(e.target as Node)) {
    // Only hide if not clicking the tooltip itself
    const selection = window.getSelection()
    if (!selection || selection.toString().trim().length === 0) {
      hideSelectionTooltip()
    }
  }
})

// Listen for language changes
browser.storage.local.onChanged.addListener((changes) => {
  if (changes.selectedLocale) {
    // Reload locale messages and update UI
    loadLocaleMessages().then(() => {
      updateTooltipText()
    })
  }
})

// Keyboard Shortcuts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Ctrl+Shift+R: Read selected text (case-insensitive for 'r' key)
  if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
    e.preventDefault()
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    if (selectedText && selectedText.length > 0) {
      handleSelectionRead()
    }
    return
  }

  // Only handle other shortcuts when reading
  if (!isReading) return

  // Space: Pause/Resume (avoid input fields and contentEditable)
  if (e.code === 'Space') {
    const target = e.target as HTMLElement
    const isEditable = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable ||
                       target.getAttribute('contenteditable') === 'true'
    
    if (!isEditable) {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('rifm-action', { detail: { action: 'togglePlayPause' } }))
      return
    }
  }

  // Escape: Stop reading
  if (e.key === 'Escape') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('rifm-action', { detail: { action: 'stopReading' } }))
    return
  }
})


