// Floating player injected into web pages
import browser from '../utils/browser'
import { FLOATING_PLAYER_STYLES } from './floatingPlayerStyles'

let floatingPlayer: HTMLDivElement | null = null
let currentMessages: Record<string, { message: string; description?: string }> = {}
let isDragging = false
const dragOffset = { x: 0, y: 0 }
let isMiniMode = false
type ThemeMode = 'light' | 'dark' | 'auto'
let currentThemeMode: ThemeMode = 'auto'
let systemThemeMediaQuery: MediaQueryList | null = null
let systemThemeChangeHandler: ((event: MediaQueryListEvent) => void) | null = null

// Event handler references for cleanup
let stateUpdateHandler: ((event: CustomEvent) => void) | null = null
let eventHandlers: Map<Element, Map<string, EventListener[]>> = new Map()
let dragHandler: ((e: MouseEvent) => void) | null = null
let stopDragHandler: (() => void) | null = null
let rafId: number | null = null

function resolvePlayerTheme(themeMode: ThemeMode): 'light' | 'dark' {
  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyPlayerTheme(themeMode: ThemeMode = currentThemeMode) {
  currentThemeMode = themeMode
  if (!floatingPlayer) return

  const resolved = resolvePlayerTheme(themeMode)
  floatingPlayer.classList.toggle('rifm-theme-dark', resolved === 'dark')
  floatingPlayer.classList.toggle('rifm-theme-light', resolved === 'light')
}

function setupSystemThemeListener() {
  if (systemThemeMediaQuery) return

  systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeChangeHandler = () => {
    if (currentThemeMode === 'auto') {
      applyPlayerTheme('auto')
    }
  }
  systemThemeMediaQuery.addEventListener('change', systemThemeChangeHandler)
}

// Load messages for selected locale
async function loadLocaleMessages(): Promise<void> {
  try {
    const result = await browser.storage.local.get(['selectedLocale'])
    const locale = (result.selectedLocale as string | undefined) || 'en'

    try {
      const url = browser.runtime.getURL(`_locales/${locale}/messages.json`)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      currentMessages = await response.json()
    } catch (error) {
      console.error('[FloatingPlayer] Failed to load locale:', locale, error)
      // Try loading English as absolute fallback
      try {
        const fallbackUrl = browser.runtime.getURL('_locales/en/messages.json')
        const fallbackResponse = await fetch(fallbackUrl)
        if (!fallbackResponse.ok) {
          throw new Error(`HTTP ${fallbackResponse.status}`)
        }
        currentMessages = await fallbackResponse.json()
      } catch (fallbackError) {
        console.error('[FloatingPlayer] Failed to load fallback locale:', fallbackError)
      }
    }
  } catch (error) {
    console.error('[FloatingPlayer] Failed to load locale messages:', error)
  }
}

// Get translated text
function getMessage(key: string): string {
  if (currentMessages[key]) {
    return currentMessages[key].message
  }
  console.warn(`[FloatingPlayer] Translation missing for key: ${key}`)
  return key
}

// Helper to add tracked event listeners
function addTrackedListener(
  element: Element | null,
  event: string,
  handler: EventListener | EventListenerObject
) {
  if (!element) return
  element.addEventListener(event, handler)
  if (!eventHandlers.has(element)) {
    eventHandlers.set(element, new Map())
  }
  const elementHandlers = eventHandlers.get(element)!
  if (!elementHandlers.has(event)) {
    elementHandlers.set(event, [])
  }
  elementHandlers.get(event)!.push(handler as EventListener)
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
    <style>${FLOATING_PLAYER_STYLES}</style>
    <div class="rifm-header">
      <div class="rifm-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
        ${getMessage('readItForMe')}
        <span class="rifm-queue-badge" id="rifm-queue-badge" style="display: none;">0</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button class="rifm-mini-toggle" id="rifm-mini-toggle" title="${getMessage('miniMode')}" aria-label="${getMessage('miniMode')}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>
        <button class="rifm-settings-toggle" id="rifm-settings-toggle" title="${getMessage('settings')}" aria-label="${getMessage('settings')}">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </button>
        <button class="rifm-close" id="rifm-close" title="${getMessage('close')}" aria-label="${getMessage('close')}">&times;</button>
      </div>
    </div>
    <div class="rifm-progress-bar">
      <div class="rifm-progress-fill" id="rifm-progress-fill"></div>
    </div>
    <div class="rifm-status" id="rifm-status">
      <div class="rifm-status-left">
        <div class="rifm-pulse"></div>
        <div class="rifm-pulse"></div>
        <div class="rifm-pulse"></div>
        <span id="rifm-status-text">${getMessage('reading')}</span>
      </div>
      <span id="rifm-time-estimate" style="font-size: 10px; opacity: 0.8;"></span>
    </div>
    <button class="rifm-clear-queue" id="rifm-clear-queue" style="display: none;">${getMessage('clearQueue')}</button>
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
        <span>${getMessage('stop')}</span>
      </button>
    </div>
    <div class="rifm-config-panel" id="rifm-config-panel">
      <div class="rifm-presets-label">${getMessage('speedPresets')}</div>
      <div class="rifm-speed-presets" id="rifm-speed-presets">
        <button class="rifm-preset-btn" data-speed="0.7">${getMessage('presetSlow')}</button>
        <button class="rifm-preset-btn active" data-speed="1.0">${getMessage('presetNormal')}</button>
        <button class="rifm-preset-btn" data-speed="1.5">${getMessage('presetFast')}</button>
        <button class="rifm-preset-btn" data-speed="2.0">x2</button>
      </div>
      <div class="rifm-slider-group" style="margin-top: 12px;">
        <div class="rifm-slider-label">
          <span>${getMessage('speed')}</span>
          <span class="rifm-slider-value" id="rifm-speed-value">0.9x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="0.9" class="rifm-slider" id="rifm-speed-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${getMessage('pitch')}</span>
          <span class="rifm-slider-value" id="rifm-pitch-value">1.0x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="1" class="rifm-slider" id="rifm-pitch-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${getMessage('volume')}</span>
          <span class="rifm-slider-value" id="rifm-volume-value">100%</span>
        </div>
        <input type="range" min="0" max="1" step="0.1" value="1" class="rifm-slider" id="rifm-volume-slider">
      </div>
      <button class="rifm-reset-btn" id="rifm-reset-btn">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        ${getMessage('resetDefaults')}
      </button>
    </div>
  `

  document.body.appendChild(floatingPlayer)
  setupSystemThemeListener()

  // Load saved settings
  browser.storage.local
    .get(['defaultRate', 'defaultPitch', 'defaultVolume', 'showProgressBar', 'isMiniMode', 'theme'])
    .then((result) => {
      const speedSlider = floatingPlayer?.querySelector('#rifm-speed-slider') as HTMLInputElement
      const pitchSlider = floatingPlayer?.querySelector('#rifm-pitch-slider') as HTMLInputElement
      const volumeSlider = floatingPlayer?.querySelector('#rifm-volume-slider') as HTMLInputElement
      const progressBar = floatingPlayer?.querySelector('.rifm-progress-bar') as HTMLElement

      const defaultRate = result.defaultRate as number | undefined
      const defaultPitch = result.defaultPitch as number | undefined
      const defaultVolume = result.defaultVolume as number | undefined
      const showProgressBar = result.showProgressBar as boolean | undefined
      const savedMiniMode = result.isMiniMode as boolean | undefined
      const savedTheme = result.theme as ThemeMode | undefined

      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto') {
        applyPlayerTheme(savedTheme)
      } else {
        applyPlayerTheme('auto')
      }

      // Restore mini mode preference
      if (savedMiniMode === true) {
        isMiniMode = true
        floatingPlayer?.classList.add('mini-mode')
        const icon = floatingPlayer?.querySelector('#rifm-mini-toggle svg path')
        if (icon) {
          icon.setAttribute('d', 'M4 8h16M4 16h16')
        }
      }

      // Show/hide progress bar based on setting (default: false/hidden)
      if (progressBar) {
        progressBar.style.display = showProgressBar === true ? 'block' : 'none'
      }

      if (speedSlider && defaultRate !== undefined) {
        speedSlider.value = defaultRate.toString()
        updateSliderValue('speed', defaultRate)

        // Update active preset button
        floatingPlayer?.querySelectorAll('.rifm-preset-btn').forEach((btn) => {
          const speed = parseFloat((btn as HTMLElement).dataset.speed || '1.0')
          if (Math.abs(speed - defaultRate) < 0.01) {
            btn.classList.add('active')
          } else {
            btn.classList.remove('active')
          }
        })
      }
      if (pitchSlider && defaultPitch !== undefined) {
        pitchSlider.value = defaultPitch.toString()
        updateSliderValue('pitch', defaultPitch)
      }
      if (volumeSlider && defaultVolume !== undefined) {
        volumeSlider.value = defaultVolume.toString()
        updateSliderValue('volume', defaultVolume)
      }
    })
    .catch((error) => {
      console.error('Failed to load player settings:', error)
    })

  // Event listeners
  addTrackedListener(floatingPlayer.querySelector('#rifm-close'), 'click', hidePlayer)
  addTrackedListener(floatingPlayer.querySelector('#rifm-stop'), 'click', () => {
    window.dispatchEvent(new CustomEvent('rifm-action', { detail: { action: 'stopReading' } }))
    hidePlayer()
  })

  addTrackedListener(floatingPlayer.querySelector('#rifm-play-pause'), 'click', togglePlayPause)

  // Mini mode toggle
  addTrackedListener(floatingPlayer.querySelector('#rifm-mini-toggle'), 'click', () => {
    isMiniMode = !isMiniMode
    floatingPlayer?.classList.toggle('mini-mode', isMiniMode)
    const icon = floatingPlayer?.querySelector('#rifm-mini-toggle svg path')
    if (icon) {
      const pathData = isMiniMode ? 'M4 8h16M4 16h16' : 'M19 13H5v-2h14v2z'
      icon.setAttribute('d', pathData)
    }
    // Persist mini mode preference
    browser.storage.local.set({ isMiniMode })
  })

  // Clear queue button
  addTrackedListener(floatingPlayer.querySelector('#rifm-clear-queue'), 'click', () => {
    window.dispatchEvent(new CustomEvent('rifm-action', { detail: { action: 'clearQueue' } }))
  })

  // Speed presets
  floatingPlayer.querySelectorAll('.rifm-preset-btn').forEach((btn) => {
    const presetHandler = () => {
      const speed = parseFloat((btn as HTMLElement).dataset.speed || '1.0')
      const speedSlider = floatingPlayer?.querySelector('#rifm-speed-slider') as HTMLInputElement
      if (speedSlider) {
        speedSlider.value = speed.toString()
        updateSliderValue('speed', speed)
        window.dispatchEvent(
          new CustomEvent('rifm-action', { detail: { action: 'updateSettings', rate: speed } })
        )
        browser.storage.local.set({ defaultRate: speed })
      }
      // Update active state
      floatingPlayer
        ?.querySelectorAll('.rifm-preset-btn')
        .forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
    }
    addTrackedListener(btn, 'click', presetHandler)
  })

  // Reset to defaults button
  addTrackedListener(floatingPlayer.querySelector('#rifm-reset-btn'), 'click', () => {
    const defaults = { rate: 0.9, pitch: 1.0, volume: 1.0 }

    const speedSlider = floatingPlayer?.querySelector('#rifm-speed-slider') as HTMLInputElement
    const pitchSlider = floatingPlayer?.querySelector('#rifm-pitch-slider') as HTMLInputElement
    const volumeSlider = floatingPlayer?.querySelector('#rifm-volume-slider') as HTMLInputElement

    if (speedSlider) {
      speedSlider.value = defaults.rate.toString()
      updateSliderValue('speed', defaults.rate)
    }
    if (pitchSlider) {
      pitchSlider.value = defaults.pitch.toString()
      updateSliderValue('pitch', defaults.pitch)
    }
    if (volumeSlider) {
      volumeSlider.value = defaults.volume.toString()
      updateSliderValue('volume', defaults.volume)
    }

    // Update active preset button
    floatingPlayer
      ?.querySelectorAll('.rifm-preset-btn')
      .forEach((b) => b.classList.remove('active'))
    floatingPlayer?.querySelector('.rifm-preset-btn[data-speed="1.0"]')?.classList.add('active')

    // Save to storage
    browser.storage.local.set({
      defaultRate: defaults.rate,
      defaultPitch: defaults.pitch,
      defaultVolume: defaults.volume,
    })

    // Update current playback if reading
    browser.runtime.sendMessage({
      action: 'updateSettings',
      rate: defaults.rate,
      pitch: defaults.pitch,
      volume: defaults.volume,
    })
  })

  // Settings toggle
  addTrackedListener(floatingPlayer.querySelector('#rifm-settings-toggle'), 'click', () => {
    const panel = floatingPlayer?.querySelector('#rifm-config-panel')
    const toggle = floatingPlayer?.querySelector('#rifm-settings-toggle')
    panel?.classList.toggle('open')
    toggle?.classList.toggle('active')
  })

  // Draggable functionality
  const headerElement = floatingPlayer.querySelector('.rifm-header') as HTMLElement

  function startDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return // Don't drag when clicking buttons
    isDragging = true
    floatingPlayer!.classList.add('dragging')
    const rect = floatingPlayer!.getBoundingClientRect()
    dragOffset.x = e.clientX - rect.left
    dragOffset.y = e.clientY - rect.top

    // Use stored handlers for consistency with cleanup
    if (dragHandler && stopDragHandler) {
      document.addEventListener('mousemove', dragHandler)
      document.addEventListener('mouseup', stopDragHandler)
    }
    e.preventDefault()
  }

  function drag(e: MouseEvent) {
    if (!isDragging || !floatingPlayer) return

    // Cancel previous animation frame if it exists
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }

    // Use requestAnimationFrame for smooth 60fps updates
    rafId = requestAnimationFrame(() => {
      if (!floatingPlayer) return

      let newX = e.clientX - dragOffset.x
      let newY = e.clientY - dragOffset.y

      // Keep within viewport with padding
      const rect = floatingPlayer.getBoundingClientRect()
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width))
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height))

      // Use transform for better performance
      floatingPlayer.style.left = newX + 'px'
      floatingPlayer.style.top = newY + 'px'
      floatingPlayer.style.bottom = 'auto'
      floatingPlayer.style.right = 'auto'

      rafId = null
    })
  }

  function stopDrag() {
    if (!isDragging) return
    isDragging = false
    floatingPlayer?.classList.remove('dragging')

    if (dragHandler) {
      document.removeEventListener('mousemove', dragHandler)
    }
    if (stopDragHandler) {
      document.removeEventListener('mouseup', stopDragHandler)
    }

    // Cancel any pending animation frame
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // Save position
    if (floatingPlayer) {
      const rect = floatingPlayer.getBoundingClientRect()
      browser.storage.local.set({
        playerPosition: {
          left: rect.left,
          top: rect.top,
        },
      })
    }
  }

  // Store drag handlers BEFORE they're used in startDrag
  dragHandler = drag
  stopDragHandler = stopDrag

  addTrackedListener(headerElement, 'mousedown', startDrag as EventListener)

  // Slider controls with real-time updates
  const speedSlider = floatingPlayer.querySelector('#rifm-speed-slider')
  const pitchSlider = floatingPlayer.querySelector('#rifm-pitch-slider')
  const volumeSlider = floatingPlayer.querySelector('#rifm-volume-slider')

  addTrackedListener(speedSlider, 'input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateSliderValue('speed', value)
    window.dispatchEvent(
      new CustomEvent('rifm-action', { detail: { action: 'updateSettings', rate: value } })
    )
    // Auto-save to storage
    browser.storage.local.set({ defaultRate: value })
  })

  addTrackedListener(pitchSlider, 'input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateSliderValue('pitch', value)
    window.dispatchEvent(
      new CustomEvent('rifm-action', { detail: { action: 'updateSettings', pitch: value } })
    )
    // Auto-save to storage
    browser.storage.local.set({ defaultPitch: value })
  })

  addTrackedListener(volumeSlider, 'input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateSliderValue('volume', value)
    window.dispatchEvent(
      new CustomEvent('rifm-action', { detail: { action: 'updateSettings', volume: value } })
    )
    // Auto-save to storage
    browser.storage.local.set({ defaultVolume: value })
  })
}

function updateSliderValue(type: 'speed' | 'pitch' | 'volume', value: number) {
  const valueElement = floatingPlayer?.querySelector(`#rifm-${type}-value`)
  if (valueElement) {
    if (type === 'volume') {
      valueElement.textContent = `${Math.round(value * 100)}%`
    } else {
      valueElement.textContent = `${value.toFixed(1)}x`
    }
  }
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

  const iconPath = floatingPlayer.querySelector('#rifm-icon path')
  const btnText = floatingPlayer.querySelector('#rifm-btn-text')
  const statusText = floatingPlayer.querySelector('#rifm-status-text')

  if (isPaused) {
    if (iconPath) iconPath.setAttribute('d', 'M8 5v14l11-7z')
    if (btnText) btnText.textContent = getMessage('resume')
    if (statusText) statusText.textContent = getMessage('paused')
  } else {
    if (iconPath) iconPath.setAttribute('d', 'M6 4h4v16H6V4zm8 0h4v16h-4V4z')
    if (btnText) btnText.textContent = getMessage('pause')
    if (statusText) statusText.textContent = getMessage('reading')
  }
}

export function updateQueueCount(count: number) {
  const badge = floatingPlayer?.querySelector('#rifm-queue-badge')
  const clearBtn = floatingPlayer?.querySelector('#rifm-clear-queue')

  if (badge) {
    if (count > 0) {
      badge.textContent = count.toString()
      badge.setAttribute('style', 'display: inline-block;')
    } else {
      badge.setAttribute('style', 'display: none;')
    }
  }

  if (clearBtn) {
    clearBtn.setAttribute('style', count > 0 ? 'display: block;' : 'display: none;')
  }
}

export function updateProgress(current: number, total: number) {
  const progressFill = floatingPlayer?.querySelector('#rifm-progress-fill') as HTMLElement
  if (progressFill && total > 0) {
    const percentage = (current / total) * 100
    progressFill.style.width = `${percentage}%`
  }
}

export function updateTimeEstimate(seconds: number) {
  const timeEstimate = floatingPlayer?.querySelector('#rifm-time-estimate')
  if (timeEstimate) {
    if (seconds > 60) {
      const mins = Math.ceil(seconds / 60)
      timeEstimate.textContent = `~${mins}min`
    } else {
      timeEstimate.textContent = `~${Math.ceil(seconds)}s`
    }
  }
}

function togglePlayPause() {
  // Dispatch custom event to content script in same context
  window.dispatchEvent(new CustomEvent('rifm-action', { detail: { action: 'togglePlayPause' } }))
}

// Listen for state updates from background
let runtimeMessageListener: ((message: any) => void) | null = null
runtimeMessageListener = (message: any) => {
  if (message.action === 'stateUpdate') {
    const { isReading, isPaused } = message.state

    if (isReading) {
      showPlayer()
        .then(() => updatePlayerState(isPaused))
        .catch(console.error)
    } else {
      hidePlayer()
    }
  }
}
browser.runtime.onMessage.addListener(runtimeMessageListener)

// Also listen for direct updates from content script (same page)
stateUpdateHandler = (event: CustomEvent) => {
  const { isReading, isPaused } = event.detail

  if (isReading) {
    showPlayer()
      .then(() => updatePlayerState(isPaused))
      .catch(console.error)
  } else {
    // When reading stops naturally (not via stop button), keep player visible
    // Update the player state but don't hide it
    updatePlayerState(isPaused)
  }
}
window.addEventListener('rifm-state-update', stateUpdateHandler as EventListener)

// Listen for language changes
let storageChangeListener: ((changes: any) => void) | null = null
storageChangeListener = (changes) => {
  if (changes.selectedLocale) {
    // Recreate player with new locale if it exists
    if (floatingPlayer) {
      const wasShowing = floatingPlayer.classList.contains('show')

      // Clean up before recreating
      eventHandlers.forEach((handlers, element) => {
        handlers.forEach((handlerList, event) => {
          handlerList.forEach((handler) => {
            element.removeEventListener(event, handler)
          })
        })
      })
      eventHandlers.clear()

      // Cancel pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      // Remove drag handlers
      if (dragHandler) {
        document.removeEventListener('mousemove', dragHandler)
        dragHandler = null
      }
      if (stopDragHandler) {
        document.removeEventListener('mouseup', stopDragHandler)
        stopDragHandler = null
      }

      floatingPlayer.remove()
      floatingPlayer = null

      // Reload messages and recreate
      loadLocaleMessages()
        .then(() => {
          createFloatingPlayer()
          if (wasShowing && floatingPlayer) {
            floatingPlayer.classList.add('show')
          }
        })
        .catch(console.error)
    }
  }

  // Listen for progress bar visibility toggle
  if (changes.showProgressBar && floatingPlayer) {
    const progressBar = floatingPlayer.querySelector('.rifm-progress-bar') as HTMLElement
    if (progressBar) {
      const newValue = changes.showProgressBar.newValue as boolean | undefined
      progressBar.style.display = newValue !== false ? 'block' : 'none'
    }
  }

  if (changes.theme) {
    const newTheme = changes.theme.newValue as ThemeMode | undefined
    if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'auto') {
      applyPlayerTheme(newTheme)
    } else {
      applyPlayerTheme('auto')
    }
  }
}
browser.storage.local.onChanged.addListener(storageChangeListener)

// Cleanup function to remove all event listeners
export function destroyPlayer() {
  // Remove all tracked DOM event listeners
  eventHandlers.forEach((handlers, element) => {
    handlers.forEach((handlerList, event) => {
      handlerList.forEach((handler) => {
        element.removeEventListener(event, handler)
      })
    })
  })
  eventHandlers.clear()

  // Cancel any pending animation frame
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  // Remove drag handlers if active
  if (dragHandler) {
    document.removeEventListener('mousemove', dragHandler)
    dragHandler = null
  }
  if (stopDragHandler) {
    document.removeEventListener('mouseup', stopDragHandler)
    stopDragHandler = null
  }

  // Remove state update listener
  if (stateUpdateHandler) {
    window.removeEventListener('rifm-state-update', stateUpdateHandler as EventListener)
    stateUpdateHandler = null
  }

  // Remove runtime message listener
  if (runtimeMessageListener) {
    browser.runtime.onMessage.removeListener(runtimeMessageListener)
    runtimeMessageListener = null
  }

  // Remove storage change listener
  if (storageChangeListener) {
    browser.storage.local.onChanged.removeListener(storageChangeListener)
    storageChangeListener = null
  }

  if (systemThemeMediaQuery && systemThemeChangeHandler) {
    systemThemeMediaQuery.removeEventListener('change', systemThemeChangeHandler)
    systemThemeMediaQuery = null
    systemThemeChangeHandler = null
  }

  // Remove player from DOM
  if (floatingPlayer) {
    floatingPlayer.remove()
    floatingPlayer = null
  }

  // Reset state
  isDragging = false
  isMiniMode = false
  currentThemeMode = 'auto'
  currentMessages = {}
}
