// Content script that runs on all web pages
// Handles text selection and speech synthesis

let currentUtterance: SpeechSynthesisUtterance | null = null
let isReading = false
let isPaused = false

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
    const processedText = preprocessText(text)
    const utterance = new SpeechSynthesisUtterance(processedText)
    
    const voices = window.speechSynthesis.getVoices()
    if (voices[voiceIndex]) {
      utterance.voice = voices[voiceIndex]
    }
    
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onend = () => {
      isReading = false
      isPaused = false
      currentUtterance = null
      hideFloatingPlayer() // Hide player when speech ends
      updateState()
    }

    utterance.onerror = () => {
      isReading = false
      isPaused = false
      currentUtterance = null
      hideFloatingPlayer() // Hide player on error
      updateState()
    }

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
    isReading = true
    isPaused = false
    updateState()
    showFloatingPlayer() // Show player immediately when starting
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'pauseReading') {
    if (isReading && !isPaused) {
      window.speechSynthesis.pause()
      isPaused = true
      updateFloatingPlayerState(true) // Update player immediately
      updateState()
    }
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'resumeReading') {
    if (isReading && isPaused) {
      window.speechSynthesis.resume()
      isPaused = false
      updateFloatingPlayerState(false) // Update player immediately
      updateState()
    }
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'stopReading') {
    window.speechSynthesis.cancel()
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
    <span>Read This</span>
  `

  selectionTooltip.addEventListener('click', handleSelectionRead)
  document.body.appendChild(selectionTooltip)
}

function showSelectionTooltip(x: number, y: number) {
  if (!selectionTooltip) createSelectionTooltip()
  if (!selectionTooltip) return

  // Position tooltip above the selection
  selectionTooltip.style.left = `${x}px`
  selectionTooltip.style.top = `${y - 45}px`
  selectionTooltip.classList.add('show')
}

function hideSelectionTooltip() {
  selectionTooltip?.classList.remove('show')
}

function handleSelectionRead() {
  const selectedText = window.getSelection()?.toString()
  if (!selectedText) return

  hideSelectionTooltip()

  // Get default settings or use defaults
  chrome.storage.local.get(['defaultVoiceIndex', 'defaultRate', 'defaultPitch', 'defaultVolume'], (result) => {
    const voiceIndex = result.defaultVoiceIndex ?? 0
    const rate = result.defaultRate ?? 0.9
    const pitch = result.defaultPitch ?? 1
    const volume = result.defaultVolume ?? 1

    // Start reading with stored settings
    const processedText = preprocessText(selectedText)
    const utterance = new SpeechSynthesisUtterance(processedText)
    
    const voices = window.speechSynthesis.getVoices()
    if (voices[voiceIndex]) {
      utterance.voice = voices[voiceIndex]
    }
    
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onend = () => {
      isReading = false
      isPaused = false
      currentUtterance = null
      hideFloatingPlayer()
      updateState()
    }

    utterance.onerror = () => {
      isReading = false
      isPaused = false
      currentUtterance = null
      hideFloatingPlayer()
      updateState()
    }

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
    isReading = true
    isPaused = false
    updateState()
    showFloatingPlayer()
  })
}

// Store selected text and show tooltip
document.addEventListener('mouseup', (e: MouseEvent) => {
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

// Floating Player Code - Inline to ensure it loads
let floatingPlayer: HTMLDivElement | null = null

function createFloatingPlayer() {
  if (floatingPlayer) return

  floatingPlayer = document.createElement('div')
  floatingPlayer.id = 'read-it-for-me-player'
  floatingPlayer.innerHTML = `
    <style>
      #read-it-for-me-player {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 300px !important;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        padding: 16px !important;
        z-index: 2147483647 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
        display: none !important;
        animation: slideIn 0.3s ease-out !important;
      }

      @keyframes slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #read-it-for-me-player.show {
        display: block !important;
      }

      .rifm-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 12px !important;
      }

      .rifm-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .rifm-close {
        background: rgba(255, 255, 255, 0.2) !important;
        border: none !important;
        border-radius: 8px !important;
        width: 24px !important;
        height: 24px !important;
        cursor: pointer !important;
        color: white !important;
        font-size: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background 0.2s !important;
      }

      .rifm-close:hover {
        background: rgba(255, 255, 255, 0.3) !important;
      }

      .rifm-status {
        font-size: 12px !important;
        opacity: 0.9 !important;
        margin-bottom: 12px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .rifm-pulse {
        width: 4px !important;
        height: 12px !important;
        background: white !important;
        border-radius: 2px !important;
        animation: pulse 1s ease-in-out infinite !important;
      }

      .rifm-pulse:nth-child(2) {
        animation-delay: 0.2s !important;
      }

      .rifm-pulse:nth-child(3) {
        animation-delay: 0.4s !important;
      }

      @keyframes pulse {
        0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
        50% { transform: scaleY(1); opacity: 1; }
      }

      .rifm-controls {
        display: flex !important;
        gap: 8px !important;
        justify-content: center !important;
      }

      .rifm-btn {
        background: rgba(255, 255, 255, 0.25) !important;
        border: none !important;
        border-radius: 10px !important;
        padding: 10px 16px !important;
        color: white !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 1 !important;
        justify-content: center !important;
      }

      .rifm-btn:hover {
        background: rgba(255, 255, 255, 0.35) !important;
        transform: translateY(-1px) !important;
      }

      .rifm-btn:active {
        transform: translateY(0) !important;
      }

      .rifm-btn-stop {
        background: rgba(239, 68, 68, 0.9) !important;
        flex: 0.8 !important;
      }

      .rifm-btn-stop:hover {
        background: rgba(220, 38, 38, 0.9) !important;
      }
    </style>
    <div class="rifm-header">
      <div class="rifm-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
        Read It For Me
      </div>
      <button class="rifm-close" id="rifm-close">×</button>
    </div>
    <div class="rifm-status" id="rifm-status">
      <div class="rifm-pulse"></div>
      <div class="rifm-pulse"></div>
      <div class="rifm-pulse"></div>
      <span id="rifm-status-text">Reading...</span>
    </div>
    <div class="rifm-controls">
      <button class="rifm-btn" id="rifm-play-pause">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" id="rifm-icon">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
        <span id="rifm-btn-text">Pause</span>
      </button>
      <button class="rifm-btn rifm-btn-stop" id="rifm-stop">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z"/>
        </svg>
        Stop
      </button>
    </div>
  `

  document.body.appendChild(floatingPlayer)

  // Event listeners
  floatingPlayer.querySelector('#rifm-close')?.addEventListener('click', hideFloatingPlayer)
  floatingPlayer.querySelector('#rifm-stop')?.addEventListener('click', () => {
    window.speechSynthesis.cancel()
    isReading = false
    isPaused = false
    currentUtterance = null
    updateState()
    hideFloatingPlayer()
  })
  
  floatingPlayer.querySelector('#rifm-play-pause')?.addEventListener('click', toggleFloatingPlayPause)
}

function showFloatingPlayer() {
  if (!floatingPlayer) createFloatingPlayer()
  floatingPlayer?.classList.add('show')
}

function hideFloatingPlayer() {
  floatingPlayer?.classList.remove('show')
}

function updateFloatingPlayerState(isPaused: boolean) {
  if (!floatingPlayer) return

  const icon = floatingPlayer.querySelector('#rifm-icon')
  const btnText = floatingPlayer.querySelector('#rifm-btn-text')
  const statusText = floatingPlayer.querySelector('#rifm-status-text')

  if (isPaused) {
    if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>'
    if (btnText) btnText.textContent = 'Resume'
    if (statusText) statusText.textContent = 'Paused'
  } else {
    if (icon) icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'
    if (btnText) btnText.textContent = 'Pause'
    if (statusText) statusText.textContent = 'Reading...'
  }
}

function toggleFloatingPlayPause() {
  if (isPaused) {
    chrome.runtime.sendMessage({ action: 'resumeReading' })
  } else {
    chrome.runtime.sendMessage({ action: 'pauseReading' })
  }
}

// Listen for state updates via custom events
window.addEventListener('rifm-state-update', ((event: CustomEvent) => {
  const { isReading, isPaused } = event.detail
  
  if (isReading) {
    showFloatingPlayer()
    updateFloatingPlayerState(isPaused)
  } else {
    hideFloatingPlayer()
  }
}) as EventListener)

// Initialize player when content script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingPlayer)
} else {
  createFloatingPlayer()
}
