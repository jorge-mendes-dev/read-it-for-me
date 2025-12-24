// Floating player injected into web pages

let floatingPlayer: HTMLDivElement | null = null
let currentMessages: Record<string, { message: string; description?: string }> = {}

// Load messages for selected locale
async function loadLocaleMessages(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['selectedLocale'], async (result) => {
      const locale = result.selectedLocale || 'en'
      
      try {
        const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        currentMessages = await response.json()
        resolve()
      } catch (error) {
        console.error('[FloatingPlayer] Failed to load locale:', locale, error)
        // Try loading English as absolute fallback
        try {
          const fallbackUrl = chrome.runtime.getURL('_locales/en/messages.json')
          const fallbackResponse = await fetch(fallbackUrl)
          currentMessages = await fallbackResponse.json()
          resolve()
        } catch (fallbackError) {
          console.error('[FloatingPlayer] Failed to load fallback locale:', fallbackError)
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
  console.warn(`[FloatingPlayer] Translation missing for key: ${key}`);
  return key
}

// Don't create player on load - only when needed via showPlayer()
// This ensures we always use the current selected locale

function createFloatingPlayer() {
  if (floatingPlayer) return
  
  // Verify messages are loaded before creating UI
  if (Object.keys(currentMessages).length === 0) {
    console.error('[FloatingPlayer] Cannot create player - no messages loaded!')
    return
  }

  floatingPlayer = document.createElement('div')
  floatingPlayer.id = 'read-it-for-me-player'
  floatingPlayer.innerHTML = `
    <style>
      #read-it-for-me-player {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        padding: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
        display: none;
        animation: slideIn 0.3s ease-out;
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
        display: block;
      }

      .rifm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .rifm-title {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .rifm-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        color: white;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .rifm-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .rifm-status {
        font-size: 12px;
        opacity: 0.9;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .rifm-pulse {
        width: 4px;
        height: 12px;
        background: white;
        border-radius: 2px;
        animation: pulse 1s ease-in-out infinite;
      }

      .rifm-pulse:nth-child(2) {
        animation-delay: 0.2s;
      }

      .rifm-pulse:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes pulse {
        0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
        50% { transform: scaleY(1); opacity: 1; }
      }

      .rifm-controls {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .rifm-btn {
        background: rgba(255, 255, 255, 0.25);
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        justify-content: center;
      }

      .rifm-btn:hover {
        background: rgba(255, 255, 255, 0.35);
        transform: translateY(-1px);
      }

      .rifm-btn:active {
        transform: translateY(0);
      }

      .rifm-btn-stop {
        background: rgba(239, 68, 68, 0.9);
        flex: 0.8;
      }

      .rifm-btn-stop:hover {
        background: rgba(220, 38, 38, 0.9);
      }
    </style>
    <div class="rifm-header">
      <div class="rifm-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
        ${getMessage('readItForMe')}
      </div>
      <button class="rifm-close" id="rifm-close">×</button>
    </div>
    <div class="rifm-status" id="rifm-status">
      <div class="rifm-pulse"></div>
      <div class="rifm-pulse"></div>
      <div class="rifm-pulse"></div>
      <span id="rifm-status-text">${getMessage('reading')}</span>
    </div>
    <div class="rifm-controls">
      <button class="rifm-btn" id="rifm-play-pause">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" id="rifm-icon">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
        <span id="rifm-btn-text">${getMessage('pause')}</span>
      </button>
      <button class="rifm-btn rifm-btn-stop" id="rifm-stop">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z"/>
        </svg>
        ${getMessage('stop')}
      </button>
    </div>
  `

  document.body.appendChild(floatingPlayer)

  // Event listeners
  floatingPlayer.querySelector('#rifm-close')?.addEventListener('click', hidePlayer)
  floatingPlayer.querySelector('#rifm-stop')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopReading' })
    hidePlayer()
  })
  
  floatingPlayer.querySelector('#rifm-play-pause')?.addEventListener('click', togglePlayPause)
}

export async function showPlayer() {
  // Create player if it doesn't exist
  if (!floatingPlayer) {
    await loadLocaleMessages()
    createFloatingPlayer()
  }
  
  // Show the player
  if (floatingPlayer) {
    floatingPlayer.classList.add('show')
  }
}

export function hidePlayer() {
  floatingPlayer?.classList.remove('show')
}

export function updatePlayerState(isPaused: boolean) {
  if (!floatingPlayer) return

  const icon = floatingPlayer.querySelector('#rifm-icon')
  const btnText = floatingPlayer.querySelector('#rifm-btn-text')
  const statusText = floatingPlayer.querySelector('#rifm-status-text')

  if (isPaused) {
    if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>'
    if (btnText) btnText.textContent = getMessage('resume')
    if (statusText) statusText.textContent = getMessage('paused')
  } else {
    if (icon) icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'
    if (btnText) btnText.textContent = getMessage('pause')
    if (statusText) statusText.textContent = getMessage('reading')
  }
}

function togglePlayPause() {
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response.isPaused) {
      chrome.runtime.sendMessage({ action: 'resumeReading' })
    } else {
      chrome.runtime.sendMessage({ action: 'pauseReading' })
    }
  })
}

// Listen for state updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'stateUpdate') {
    const { isReading, isPaused } = message.state
    
    if (isReading) {
      showPlayer().then(() => updatePlayerState(isPaused)).catch(console.error)
    } else {
      hidePlayer()
    }
  }
})

// Also listen for direct updates from content script (same page)
window.addEventListener('rifm-state-update', ((event: CustomEvent) => {
  const { isReading, isPaused } = event.detail
  
  if (isReading) {
    showPlayer().then(() => updatePlayerState(isPaused)).catch(console.error)
  } else {
    hidePlayer()
  }
}) as EventListener)

// Listen for language changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedLocale) {
    // Recreate player with new locale if it exists
    if (floatingPlayer) {
      const wasShowing = floatingPlayer.classList.contains('show')
      floatingPlayer.remove()
      floatingPlayer = null
      
      // Reload messages and recreate
      loadLocaleMessages().then(() => {
        createFloatingPlayer()
        if (wasShowing && floatingPlayer) {
          floatingPlayer.classList.add('show')
        }
      }).catch(console.error)
    }
  }
})
