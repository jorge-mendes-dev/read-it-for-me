// Floating player injected into web pages
import browser from '../utils/browser'

let floatingPlayer: HTMLDivElement | null = null
let currentMessages: Record<string, { message: string; description?: string }> = {}
let isDragging = false
const dragOffset = { x: 0, y: 0 }
let isMiniMode = false

// Event handler references for cleanup
let stateUpdateHandler: ((event: CustomEvent) => void) | null = null
let eventHandlers: Map<Element, Map<string, EventListener[]>> = new Map()
let dragHandler: ((e: MouseEvent) => void) | null = null
let stopDragHandler: (() => void) | null = null
let rafId: number | null = null

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
      const fallbackUrl = browser.runtime.getURL('_locales/en/messages.json')
      const fallbackResponse = await fetch(fallbackUrl)
      currentMessages = await fallbackResponse.json()
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
    <style>
      #read-it-for-me-player {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: #141519;
        border: 1px solid #23252a;
        border-radius: 12px;
        padding: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f7f8f8;
        display: none;
        animation: slideIn 0.3s ease-out;
        transition: all 0.3s ease;
        cursor: move;
        will-change: transform;
      }

      #read-it-for-me-player.dragging {
        cursor: grabbing !important;
        transition: none !important;
        border-color: #2d3038;
        transform: scale(1.02);
      }

      #read-it-for-me-player.dragging * {
        cursor: grabbing !important;
        user-select: none !important;
      }

      #read-it-for-me-player.mini-mode {
        width: 60px;
        padding: 12px 10px;
        border-radius: 12px;
      }

      #read-it-for-me-player.mini-mode .rifm-settings-toggle {
        display: none;
      }

      #read-it-for-me-player.mini-mode .rifm-header {
        margin-bottom: 8px;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }

      #read-it-for-me-player.mini-mode .rifm-header > div:first-child {
        order: 2;
        display: flex;
        justify-content: center;
        width: 100%;
      }

      #read-it-for-me-player.mini-mode .rifm-header > div:last-child {
        order: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }

      #read-it-for-me-player.mini-mode .rifm-progress-bar {
        height: 2px;
        margin-bottom: 8px;
        border-radius: 1px;
      }

      #read-it-for-me-player.mini-mode .rifm-status {
        margin-bottom: 8px;
        justify-content: center;
      }

      #read-it-for-me-player.mini-mode .rifm-status-left {
        gap: 3px;
      }

      #read-it-for-me-player.mini-mode .rifm-status-left span {
        display: none;
      }

      #read-it-for-me-player.mini-mode .rifm-pulse {
        width: 2.5px;
        height: 10px;
      }

      #read-it-for-me-player.mini-mode .rifm-controls {
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }

      #read-it-for-me-player.mini-mode .rifm-close {
        width: 40px;
        height: 40px;
        font-size: 14px;
        border-radius: 12px;
      }

      #read-it-for-me-player.mini-mode .rifm-mini-toggle {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        margin-left: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-mini-toggle svg {
        width: 14px;
        height: 14px;
      }

      #read-it-for-me-player.mini-mode .rifm-clear-queue {
        padding: 4px;
        font-size: 10px;
        margin-bottom: 4px;
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

      @keyframes bounceIn {
        0% {
          transform: scale(0.3);
          opacity: 0;
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }

      @keyframes progressGlow {
        0%, 100% {
          opacity: 0.85;
        }
        50% {
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
        cursor: grab;
        user-select: none;
      }

      .rifm-header:active {
        cursor: grabbing;
      }

      .rifm-title {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #read-it-for-me-player.mini-mode .rifm-title {
        font-size: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-title svg {
        width: 16px;
        height: 16px;
      }

      #read-it-for-me-player.mini-mode .rifm-title {
        margin-bottom: 0;
      }

      .rifm-queue-badge {
        background: #1a1c22;
        border: 1px solid #2d3038;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        margin-left: 4px;
        animation: bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .rifm-queue-badge:hover {
        transform: scale(1.1);
        background: #21242c;
      }

      #read-it-for-me-player.mini-mode .rifm-queue-badge {
        margin-left: 0;
      }

      .rifm-close {
        background: #1a1c22;
        border: 1px solid #2d3038;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: #f7f8f8;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .rifm-close:hover {
        background: #21242c;
        transform: rotate(90deg) scale(1.1);
      }

      .rifm-close:active {
        transform: rotate(90deg) scale(0.9);
      }

      .rifm-progress-bar {
        height: 3px;
        background: #1a1c22;
        border-radius: 2px;
        margin-bottom: 12px;
        overflow: hidden;
        position: relative;
      }

      .rifm-progress-fill {
        height: 100%;
        background: #5e6ad2;
        width: 0%;
        transition: width 0.1s linear;
        position: relative;
        animation: progressGlow 2s ease-in-out infinite;
      }

      .rifm-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100px;
        background: rgba(255, 255, 255, 0.12);
        animation: shimmer 2s ease-in-out infinite;
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      .rifm-status {
        font-size: 12px;
        opacity: 0.9;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .rifm-status-left {
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

      @media (prefers-reduced-motion: reduce) {
        #read-it-for-me-player,
        .rifm-btn,
        .rifm-btn::before,
        .rifm-queue-badge,
        .rifm-progress-fill,
        .rifm-pulse,
        #rifm-selection-tooltip {
          animation: none !important;
          transition: none !important;
        }
      }

      .rifm-controls {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .rifm-btn {
        background: #1a1c22;
        border: 1px solid #2d3038;
        border-radius: 8px;
        padding: 10px 16px;
        color: #f7f8f8;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .rifm-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }

      .rifm-btn:active::before {
        width: 300px;
        height: 300px;
      }

      #read-it-for-me-player.mini-mode .rifm-btn {
        width: 44px;
        height: 44px;
        padding: 10px;
        flex: none;
        border-radius: 12px;
        margin: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-btn svg {
        width: 16px;
        height: 16px;
      }

      #read-it-for-me-player.mini-mode .rifm-btn span {
        display: none;
      }

      .rifm-btn:hover {
        background: #21242c;
        transform: translateY(-2px) scale(1.02);
      }

      .rifm-btn:active {
        transform: translateY(0) scale(0.98);
      }

      .rifm-btn svg {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        z-index: 1;
      }

      .rifm-btn:hover svg {
        transform: scale(1.1) rotate(5deg);
      }

      .rifm-btn-stop {
        background: #1a1c22;
        flex: 0.8;
        border-color: #5e6ad2;
      }

      .rifm-btn-stop:hover {
        background: #21242c;
      }

      .rifm-speed-presets {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
        justify-content: center;
      }

      .rifm-presets-label {
        font-size: 10px;
        opacity: 0.8;
        margin-bottom: 6px;
        text-align: center;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .rifm-preset-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 4px 8px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .rifm-preset-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .rifm-preset-btn.active {
        background: rgba(255, 255, 255, 0.4);
        border-color: white;
      }

      .rifm-clear-queue {
        background: rgba(255, 165, 0, 0.8);
        border: none;
        border-radius: 6px;
        padding: 4px 8px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 8px;
        width: 100%;
      }

      .rifm-clear-queue:hover {
        background: rgba(255, 140, 0, 0.9);
      }

      .rifm-reset-btn {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 8px 12px;
        color: rgba(255, 255, 255, 0.95);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 12px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        padding-top: 12px;
      }

      .rifm-reset-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
      }

      .mini-mode .rifm-config-panel,
      .mini-mode .rifm-progress-bar,
      .mini-mode .rifm-clear-queue {
        display: none !important;
      }

      .mini-mode .rifm-status {
        margin-bottom: 8px;
      }

      .rifm-settings-toggle {
        background: #1a1c22;
        border: 1px solid #2d3038;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: white;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-left: 4px;
      }

      .rifm-settings-toggle:hover {
        background: #21242c;
        transform: rotate(90deg);
      }

      .rifm-settings-toggle.active {
        background: #21242c;
        transform: rotate(180deg);
      }

      .rifm-mini-toggle {
        background: #1a1c22;
        border: 1px solid #2d3038;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: white;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-left: 4px;
      }

      .rifm-mini-toggle:hover {
        background: #21242c;
      }

      .rifm-config-panel {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out, margin-top 0.3s ease-out;
        margin-top: 0;
      }

      .rifm-config-panel.open {
        max-height: 250px;
        margin-top: 12px;
      }

      .rifm-slider-group {
        margin-bottom: 12px;
      }

      .rifm-slider-group:last-child {
        margin-bottom: 0;
      }

      .rifm-slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        margin-bottom: 6px;
        opacity: 0.95;
      }

      .rifm-slider-value {
        background: rgba(255, 255, 255, 0.3);
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 10px;
      }

      .rifm-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }

      .rifm-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: 1px solid #23252a;
      }

      .rifm-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: 1px solid #23252a;
      }
    </style>
    <div class="rifm-header">
      <div class="rifm-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
        ${getMessage('readItForMe')}
        <span class="rifm-queue-badge" id="rifm-queue-badge" style="display: none;">0</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button class="rifm-mini-toggle" id="rifm-mini-toggle" title="Mini Mode">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>
        <button class="rifm-settings-toggle" id="rifm-settings-toggle" title="Settings">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </button>
        <button class="rifm-close" id="rifm-close" title="Close">×</button>
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

  // Load saved settings
  browser.storage.local
    .get(['defaultRate', 'defaultPitch', 'defaultVolume', 'showProgressBar', 'isMiniMode'])
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

  // Remove player from DOM
  if (floatingPlayer) {
    floatingPlayer.remove()
    floatingPlayer = null
  }

  // Reset state
  isDragging = false
  isMiniMode = false
  currentMessages = {}
}
