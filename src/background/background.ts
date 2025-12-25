// Background service worker for Read It For Me
// Coordinates between popup and content script

interface SpeechState {
  isReading: boolean
  isPaused: boolean
  currentText: string
}

let speechState: SpeechState = {
  isReading: false,
  isPaused: false,
  currentText: ''
}

// Forward messages to active tab
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case 'startReading':
    case 'pauseReading':
    case 'resumeReading':
    case 'stopReading':
      // Forward to content script of active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            sendResponse(response)
          })
        }
      })
      return true

    case 'stateUpdate':
      // Store state and broadcast to all tabs
      speechState = {
        isReading: message.state.isReading,
        isPaused: message.state.isPaused,
        currentText: message.state.currentText || speechState.currentText
      }
      sendResponse({ success: true })
      break

    case 'getState':
      sendResponse(speechState)
      break
  }
  
  return true
})

