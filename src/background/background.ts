// Background service worker for Read It For Me
// Coordinates between popup and content script
import browser from '../utils/browser'
import type { Runtime } from 'webextension-polyfill'

interface SpeechState {
  isReading: boolean
  isPaused: boolean
  currentText: string
}

interface Message {
  action: string
  state?: SpeechState
  [key: string]: unknown
}

let speechState: SpeechState = {
  isReading: false,
  isPaused: false,
  currentText: ''
}

// Forward messages to active tab
browser.runtime.onMessage.addListener((message: unknown, _sender: Runtime.MessageSender) => {
  const msg = message as Message
  switch (msg.action) {
    case 'startReading':
    case 'pauseReading':
    case 'resumeReading':
    case 'stopReading': {
      // Forward to content script of active tab
      return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          return browser.tabs.sendMessage(tabs[0].id, message)
        }
        return null
      })
    }

    case 'stateUpdate':
      // Store state and broadcast to all tabs
      if (msg.state) {
        speechState = {
          isReading: msg.state.isReading,
          isPaused: msg.state.isPaused,
          currentText: msg.state.currentText || speechState.currentText
        }
      }
      return Promise.resolve({ success: true })

    case 'getState':
      return Promise.resolve(speechState)

    default:
      return Promise.resolve(null)
  }
})

