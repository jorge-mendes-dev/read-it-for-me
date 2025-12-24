// Content script that runs on all web pages
// Handles text selection and speech synthesis
import { showPlayer, hidePlayer, updatePlayerState } from './floatingPlayer'

let currentUtterance: SpeechSynthesisUtterance | null = null
let isReading = false
let isPaused = false
let currentMessages: any = {}

// Queue system for reading requests
interface ReadingRequest {
  text: string
  voiceIndex?: number
  rate: number
  pitch: number
  volume: number
}
let readingQueue: ReadingRequest[] = []

// Function to process next item in queue
function processNextInQueue() {
  if (readingQueue.length === 0) {
    isReading = false
    isPaused = false
    currentUtterance = null
    hidePlayer()
    updateState()
    return
  }
  
  const request = readingQueue.shift()!
  startReading(request.text, request.voiceIndex, request.rate, request.pitch, request.volume)
}

// Function to start reading (used by both queue and direct calls)
function startReading(text: string, voiceIndex: number | undefined, rate: number, pitch: number, volume: number) {
  const processedText = preprocessText(text)
  const utterance = new SpeechSynthesisUtterance(processedText)
  
  const voices = window.speechSynthesis.getVoices()
  
  if (voiceIndex !== undefined && voices[voiceIndex]) {
    utterance.voice = voices[voiceIndex]
  } else {
    // Fallback to auto-detection if no voice specified
    const detectedLanguage = detectLanguageFromText(text)
    const bestVoice = getBestVoiceForLanguage(detectedLanguage)
    if (bestVoice) {
      utterance.voice = bestVoice
    } else if (voices.length > 0) {
      utterance.voice = voices[0]
    }
  }
  
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = volume

  utterance.onend = () => {
    processNextInQueue()
  }

  utterance.onerror = () => {
    processNextInQueue()
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
  isReading = true
  isPaused = false
  updateState()
  showPlayer().catch(console.error)
}

// Load messages for selected locale
async function loadLocaleMessages(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['selectedLocale'], async (result) => {
      const locale = result.selectedLocale || 'en'
      
      try {
        const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`)
        const response = await fetch(url)
        currentMessages = await response.json()
        resolve()
      } catch (error) {
        console.error('[ContentScript] Failed to load locale:', locale, error)
        // Try loading English as absolute fallback
        try {
          const fallbackUrl = chrome.runtime.getURL('_locales/en/messages.json')
          const fallbackResponse = await fetch(fallbackUrl)
          currentMessages = await fallbackResponse.json()
          resolve()
        } catch (fallbackError) {
          console.error('[ContentScript] Failed to load fallback locale:', fallbackError)
          reject(fallbackError)
        }
      }
    })
  })
}

// Get translated text
function getMessage(key: string): string {
  if (currentMessages[key]) {
    return currentMessages[key].message
  }
  console.warn(`[ContentScript] Translation missing for key: ${key}`);
  return key
}

// Initialize locale on load
loadLocaleMessages().then(() => {
  // Create tooltip after locale is loaded
  createSelectionTooltip()
  // Ensure tooltip has correct text
  updateTooltipText()
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
  processed = processed.replace(/[*_#`~\[\]]/g, '')
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
  // Send update to background
  chrome.runtime.sendMessage({
    action: 'stateUpdate',
    state: { isReading, isPaused, currentText: currentUtterance?.text || '' }
  })
  
  // Also dispatch custom event for floating player in same page
  window.dispatchEvent(new CustomEvent('rifm-state-update', {
    detail: { isReading, isPaused }
  }))
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection()?.toString() || '';
    const pageLang = document.documentElement.lang || 
                     document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                     navigator.language;
    sendResponse({ 
      text: selectedText,
      language: pageLang
    });
    return true
  }

  if (request.action === 'startReading') {
    const { text, voiceIndex, rate, pitch, volume } = request
    
    // Add to queue if already reading, otherwise start immediately
    if (isReading && !isPaused) {
      readingQueue.push({ text, voiceIndex, rate, pitch, volume })
      sendResponse({ success: true, queued: true })
    } else {
      // Stop current if paused and start new one
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      readingQueue = [] // Clear queue
      startReading(text, voiceIndex, rate, pitch, volume)
      sendResponse({ success: true, queued: false })
    }
    return true
  }

  if (request.action === 'pauseReading') {
    if (isReading && !isPaused) {
      window.speechSynthesis.pause()
      isPaused = true
      updatePlayerState(true) // Update player immediately
      updateState()
    }
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'resumeReading') {
    if (isReading && isPaused) {
      window.speechSynthesis.resume()
      isPaused = false
      updatePlayerState(false) // Update player immediately
      updateState()
    }
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'stopReading') {
    window.speechSynthesis.cancel()
    readingQueue = [] // Clear the queue
    isReading = false
    isPaused = false
    currentUtterance = null
    updateState()
    sendResponse({ success: true })
    return true
  }

  return true
});

// Selection Tooltip Button
let selectionTooltip: HTMLDivElement | null = null

function createSelectionTooltip() {
  if (selectionTooltip) return

  selectionTooltip = document.createElement('div')
  selectionTooltip.id = 'rifm-selection-tooltip'
  selectionTooltip.innerHTML = `
    <style>
      #rifm-selection-tooltip {
        position: absolute !important;
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
        transition: all 0.2s !important;
        user-select: none !important;
        backdrop-filter: blur(10px) !important;
      }

      #rifm-selection-tooltip:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5) !important;
      }

      #rifm-selection-tooltip.show {
        display: flex !important;
      }

      #rifm-selection-tooltip svg {
        width: 16px !important;
        height: 16px !important;
        fill: white !important;
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

function showSelectionTooltip(x: number, y: number) {
  if (!selectionTooltip) return // Don't auto-create, wait for locale to load

  // Position tooltip above the selection
  selectionTooltip.style.left = `${x}px`
  selectionTooltip.style.top = `${y - 45}px`
  selectionTooltip.classList.add('show')
}

function hideSelectionTooltip() {
  selectionTooltip?.classList.remove('show')
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

  // Get saved voice settings
  chrome.storage.local.get(['defaultVoiceIndex', 'defaultRate', 'defaultPitch', 'defaultVolume'], (result) => {
    const voiceIndex = result.defaultVoiceIndex
    const rate = result.defaultRate ?? 0.9
    const pitch = result.defaultPitch ?? 1
    const volume = result.defaultVolume ?? 1

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
  })
}

// Store selected text and show tooltip
document.addEventListener('mouseup', () => {
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString()
    
    if (selectedText && selectedText.trim().length > 0) {
      chrome.storage.local.set({ lastSelectedText: selectedText })
      
      // Get selection position
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      
      if (rect) {
        const x = rect.left + (rect.width / 2) - 50 // Center tooltip
        const y = rect.top + window.scrollY
        showSelectionTooltip(x, y)
      }
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
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedLocale) {
    // Reload locale messages and update UI
    loadLocaleMessages().then(() => {
      updateTooltipText()
    })
  }
})
