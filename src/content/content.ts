// Content script that runs on all web pages
// Handles text selection and speech synthesis
import browser from '../utils/browser'
import { showPlayer, hidePlayer, updatePlayerState, updateQueueCount, updateProgress, updateTimeEstimate, destroyPlayer } from './floatingPlayer'
import type { ReadingRequest } from '../types'

let currentUtterance: SpeechSynthesisUtterance | null = null
let isReading = false
let isPaused = false
let currentMessages: any = {}
let progressInterval: number | null = null
let startTime = 0
let autoHideTimeout: number | null = null
let currentHighlightElement: HTMLElement | null = null
let currentReadingText: string = ''
let originalSelectionRange: Range | null = null
let highlightFadeoutTimeout: number | null = null
let tooltipHideTimeout: number | null = null
let lastHighlightCharIndex: number = -1 // Track the character position of the last highlight
let wordHighlightEnabled: boolean = true // Track if word highlighting is enabled
let followHighlight: boolean = false // Track if auto-scroll to highlighted words is enabled

// Event handler references for cleanup
let mouseUpHandler: (() => void) | null = null
let mouseDownHandler: ((e: MouseEvent) => void) | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
let rifmActionHandler: ((event: CustomEvent) => void) | null = null
let storageChangeHandler: ((changes: any) => void) | null = null
let beforeunloadHandler: (() => void) | null = null
let selectionTooltipClickHandler: (() => void) | null = null

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
let queuedSelectionRanges: (Range | null)[] = [] // Store selection ranges for each queue item

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
    updateState()
    
    // Auto-hide player after 2 seconds when reading finishes
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
    }
    autoHideTimeout = window.setTimeout(() => {
      hidePlayer()
      autoHideTimeout = null
    }, 2000)
    return
  }
  
  const request = readingQueue.shift()!
  const savedRange = queuedSelectionRanges.shift() || null
  
  // Update count after shifting to show correct remaining items
  updateQueueCount(readingQueue.length)
  
  // Pass the saved range to startReading for queue items
  startReading(request.text, request.voiceIndex, request.rate, request.pitch, request.volume, savedRange)
}

// Word highlighting function
function highlightCurrentWord(charIndex: number) {
  // Skip if word highlighting is disabled
  if (!wordHighlightEnabled) return
  
  // Remove previous highlight instantly (no animation to prevent blinking)
  clearWordHighlight(false)
  
  // Find word boundaries in the spoken text using non-whitespace pattern
  const text = currentReadingText
  if (!text || charIndex >= text.length) return
  
  // Find start of word (move back while encountering non-whitespace)
  let start = charIndex
  while (start > 0 && /\S/.test(text[start - 1])) {
    start--
  }
  
  // Find end of word (move forward while encountering non-whitespace)
  let end = charIndex
  while (end < text.length && /\S/.test(text[end])) {
    end++
  }
  
  const currentWord = text.substring(start, end).trim()
  if (!currentWord) return
  
  // Only highlight if this word comes after our last highlight position
  if (charIndex <= lastHighlightCharIndex) {
    return // Skip words we've already passed
  }
  
  // Calculate which occurrence of this word we should highlight
  // by counting how many times it appears before this position
  const textBeforeWord = text.substring(0, start)
  const escapedWord = currentWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp('\\b' + escapedWord + '\\b', 'gi')
  const matchesBefore = textBeforeWord.match(regex)
  const targetOccurrence = matchesBefore ? matchesBefore.length : 0
  
  // Add animation keyframes if not already added
  if (!document.getElementById('rifm-highlight-styles')) {
    const style = document.createElement('style')
    style.id = 'rifm-highlight-styles'
    style.textContent = `
      @keyframes rifm-highlight-pulse {
        0% { 
          opacity: 0;
          transform: scale(0.95);
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
        }
        15% {
          opacity: 1;
          transform: scale(1.02);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
        }
        50% { 
          transform: scale(1.01);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
        }
        100% { 
          transform: scale(1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
        }
      }
      
      @keyframes rifm-highlight-fadeout {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.98);
        }
      }
    `
    document.head.appendChild(style)
  }
  
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  // Try to find and highlight the word in the DOM
  try {
    // Use the original selection range to limit search area
    // This prevents highlighting words outside the selected text
    let searchRoot: Node = document.body
    
    if (originalSelectionRange) {
      // Get the common ancestor of the original selection
      searchRoot = originalSelectionRange.commonAncestorContainer
      // If it's a text node, use its parent element
      if (searchRoot.nodeType === Node.TEXT_NODE) {
        searchRoot = searchRoot.parentElement || document.body
      }
    }
    
    // Case-insensitive comparison for matching
    const lowerWord = currentWord.toLowerCase()
    
    // Find all text nodes in the search area
    const walker = document.createTreeWalker(
      searchRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and our own highlight elements
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tagName = parent.tagName.toLowerCase()
          if (tagName === 'script' || tagName === 'style' || parent.id === 'rifm-word-highlight') {
            return NodeFilter.FILTER_REJECT
          }
          // Only accept nodes that contain the current word (case-insensitive)
          return node.textContent && node.textContent.toLowerCase().includes(lowerWord) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT
        }
      }
    )
    
    // Find the text node and highlight position
    let found = false
    let node: Node | null
    let wordsProcessed = 0
    let occurrenceCount = 0 // Count how many times we've seen this word
    
    while ((node = walker.nextNode()) && !found) {
      const textNode = node as Text
      const content = textNode.textContent || ''
      const lowerContent = content.toLowerCase()
      
      // Skip this node if it's not within the original selection range
      if (originalSelectionRange && !isNodeInRange(textNode, originalSelectionRange)) {
        wordsProcessed++
        continue
      }
      
      // Find all occurrences of the word in this text node
      let searchStart = 0
      let wordIndex = -1
      
      while (searchStart < content.length) {
        wordIndex = lowerContent.indexOf(lowerWord, searchStart)
        
        if (wordIndex === -1) break
        
        // Validate this is a whole word, not a partial match (e.g., "cat" in "category")
        const before = content[wordIndex - 1]
        const after = content[wordIndex + currentWord.length]
        const isWholeWord = (!before || /\s/.test(before)) && (!after || /\s/.test(after))
        
        if (isWholeWord) {
          // Check if this is the occurrence we're looking for
          if (occurrenceCount === targetOccurrence) {
            const actualWord = content.substring(wordIndex, wordIndex + currentWord.length)
            
            try {
              // Create highlight element
              const highlight = document.createElement('span')
              highlight.id = 'rifm-word-highlight'
              highlight.style.cssText = `
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%);
                color: inherit;
                padding: 2px 4px;
                border-radius: 6px;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform, opacity;
                ${prefersReducedMotion ? 'opacity: 0;' : 'animation: rifm-highlight-pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1);'}
              `
              
              // Fade in smoothly for reduced motion users
              if (prefersReducedMotion) {
                requestAnimationFrame(() => {
                  highlight.style.opacity = '1'
                })
              }
              
              // Split the text node to isolate the word
              // This preserves all text and is safer than extractContents
              const wordEndIndex = wordIndex + actualWord.length
              
              // If the word isn't at the start, split before it
              let targetNode = textNode
              if (wordIndex > 0) {
                targetNode = textNode.splitText(wordIndex) as Text
              }
              
              // If there's text after the word, split after it
              if (wordEndIndex < content.length) {
                targetNode.splitText(actualWord.length)
              }
              
              // Now targetNode contains only the word text
              // Wrap it in the highlight span
              const parent = targetNode.parentNode
              if (parent) {
                highlight.textContent = targetNode.textContent
                parent.replaceChild(highlight, targetNode)
                
                currentHighlightElement = highlight
                lastHighlightCharIndex = charIndex // Track this position for next search
                
                // Scroll element into view if follow highlight is enabled
                if (followHighlight) {
                  setTimeout(() => {
                    if (currentHighlightElement === highlight) {
                      highlight.scrollIntoView({ 
                        behavior: prefersReducedMotion ? 'auto' : 'smooth',
                        block: 'center',
                        inline: 'nearest'
                      })
                    }
                  }, prefersReducedMotion ? 0 : 100)
                }
                
                found = true
                console.debug('[RIFM] Highlighted word:', actualWord)
                break
              }
            } catch (error) {
              console.debug('[RIFM] Cannot highlight word (may cross element boundary):', error)
              // Continue searching for next occurrence
              searchStart = wordIndex + 1
              occurrenceCount++
              continue
            }
            // Successfully highlighted - increment counter
            occurrenceCount++
          } else {
            // Not the target occurrence yet, keep counting
            occurrenceCount++
          }
        }
        
        searchStart = wordIndex + 1
      }
      
      wordsProcessed++
      // Safety limit: don't process more than 1000 text nodes
      if (wordsProcessed > 1000) {
        console.debug('[RIFM] Stopped search after 1000 nodes for performance')
        break
      }
    }
    
    if (!found) {
      console.debug('[RIFM] Could not find word in DOM:', currentWord)
    }
  } catch (error) {
    console.debug('[RIFM] Error highlighting word:', error)
  }
}

function clearWordHighlight(animate: boolean = true) {
  if (currentHighlightElement) {
    try {
      // Cancel any pending fadeout animation
      if (highlightFadeoutTimeout !== null) {
        clearTimeout(highlightFadeoutTimeout)
        highlightFadeoutTimeout = null
      }
      
      // Get the text content before removing
      const text = currentHighlightElement.textContent || ''
      const parent = currentHighlightElement.parentNode
      const elementToRemove = currentHighlightElement
      
      // Clear the reference immediately to allow new highlights
      currentHighlightElement = null
      
      if (parent && text) {
        // Check if animations are preferred
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        
        if (!prefersReducedMotion && animate) {
          // Smooth fade-out before removing (only when animate is true)
          elementToRemove.style.animation = 'rifm-highlight-fadeout 0.3s ease-out forwards'
          
          highlightFadeoutTimeout = window.setTimeout(() => {
            highlightFadeoutTimeout = null
            if (parent.contains(elementToRemove)) {
              const textNode = document.createTextNode(text)
              parent.replaceChild(textNode, elementToRemove)
              // Normalize to merge adjacent text nodes and prevent fragmentation
              parent.normalize()
            }
          }, 300)
        } else {
          // Instant removal (when animate is false or reduced motion)
          const textNode = document.createTextNode(text)
          parent.replaceChild(textNode, elementToRemove)
          // Normalize to merge adjacent text nodes and prevent fragmentation
          parent.normalize()
        }
      } else {
        // Fallback: just remove the element
        elementToRemove.remove()
      }
    } catch (e) {
      // Element might already be removed
      console.debug('[RIFM] Error clearing highlight:', e)
    }
  }
}

// Helper function to check if a node is within a range
function isNodeInRange(node: Node, range: Range): boolean {
  try {
    const nodeRange = document.createRange()
    nodeRange.selectNode(node)
    
    // Check if the node range intersects with the original selection range
    return (
      range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
    )
  } catch (e) {
    return false
  }
}

// Function to start reading (used by both queue and direct calls)
function startReading(text: string, voiceIndex: number | undefined, rate: number, pitch: number, volume: number, savedRange?: Range | null) {
  // Clear any pending auto-hide when starting new reading
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout)
    autoHideTimeout = null
  }
  
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

  // Store current text and selection range for word highlighting
  currentReadingText = processedText
  lastHighlightCharIndex = -1 // Reset for new reading session
  
  // Use saved range if provided (for queue items), otherwise get current selection
  if (savedRange) {
    originalSelectionRange = savedRange
  } else {
    // Store the current selection range to limit highlighting to selected text
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      originalSelectionRange = selection.getRangeAt(0).cloneRange()
    } else {
      originalSelectionRange = null
    }
  }

  // Word boundary tracking for word highlighting
  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name === 'word' && event.charIndex !== undefined) {
      highlightCurrentWord(event.charIndex)
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
    clearWordHighlight()
    originalSelectionRange = null // Clear the stored range
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    updateProgress(100, 100)
    processNextInQueue()
  }

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    console.error('Speech synthesis error:', event.error, event)
    clearWordHighlight()
    originalSelectionRange = null // Clear the stored range
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

// Load word highlight setting
browser.storage.local.get(['wordHighlightEnabled', 'followHighlight']).then((result) => {
  wordHighlightEnabled = (result.wordHighlightEnabled as boolean | undefined) ?? true
  followHighlight = (result.followHighlight as boolean | undefined) ?? false
}).catch((error) => {
  console.error('[ContentScript] Failed to load word highlight setting:', error)
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
    
    // Save current selection range for queue highlighting
    const selection = window.getSelection()
    const selectionRange = (selection && selection.rangeCount > 0) 
      ? selection.getRangeAt(0).cloneRange() 
      : null
    
    // Add to queue if already reading, otherwise start immediately
    if (isReading && !isPaused) {
      readingQueue.push({ text, voiceIndex, rate, pitch, volume })
      queuedSelectionRanges.push(selectionRange)
      showPlayer().then(() => updateQueueCount(readingQueue.length)) // Ensure player is visible first
      return Promise.resolve({ success: true, queued: true })
    } else {
      // Stop current if paused and start new one
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      clearWordHighlight()
      originalSelectionRange = null
      readingQueue = [] // Clear queue
      queuedSelectionRanges = [] // Clear saved ranges
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
    clearWordHighlight()
    originalSelectionRange = null
    window.speechSynthesis.cancel()
    readingQueue = [] // Clear the queue
    queuedSelectionRanges = [] // Clear saved ranges
    isReading = false
    isPaused = false
    currentUtterance = null
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
      autoHideTimeout = null
    }
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
    queuedSelectionRanges = []
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
rifmActionHandler = (event: CustomEvent) => {
  const { action, ...params } = event.detail
  
  if (action === 'stopReading') {
    // Clear any pending auto-hide
    if (autoHideTimeout !== null) {
      clearTimeout(autoHideTimeout)
      autoHideTimeout = null
    }
    clearWordHighlight()
    originalSelectionRange = null // Clear the stored range
    window.speechSynthesis.cancel()
    readingQueue = []
    queuedSelectionRanges = []
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
    queuedSelectionRanges = []
    updateQueueCount(0)
  }
  
  if (action === 'updateSettings') {
    // Update current utterance settings in real-time if reading
    if (currentUtterance && isReading && !isPaused) {
      if (params.rate !== undefined) currentUtterance.rate = params.rate
      if (params.pitch !== undefined) currentUtterance.pitch = params.pitch
      if (params.volume !== undefined) currentUtterance.volume = params.volume
    }
  }
}
window.addEventListener('rifm-action', rifmActionHandler as EventListener)

// Selection Tooltip Button
let selectionTooltip: HTMLDivElement | null = null

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

  selectionTooltipClickHandler = handleSelectionRead
  selectionTooltip.addEventListener('click', selectionTooltipClickHandler)
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

  // Clear any pending hide timeout to prevent race condition
  if (tooltipHideTimeout !== null) {
    clearTimeout(tooltipHideTimeout)
    tooltipHideTimeout = null
  }

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
    const autoSelect = (result.autoSelectVoice as boolean | undefined) ?? true // Default to true

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
      // Save current selection range for this queue item
      const currentSelection = window.getSelection()
      const selectionRange = (currentSelection && currentSelection.rangeCount > 0) 
        ? currentSelection.getRangeAt(0).cloneRange() 
        : null
      
      readingQueue.push({ text: selectedText, voiceIndex, rate, pitch, volume })
      queuedSelectionRanges.push(selectionRange)
      showPlayer().then(() => updateQueueCount(readingQueue.length))
    } else {
      // Stop current if paused and start new one
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      readingQueue = [] // Clear queue
      queuedSelectionRanges = [] // Clear saved ranges
      startReading(selectedText, voiceIndex, rate, pitch, volume)
    }
  }).catch((error) => {
    console.error('Failed to load voice settings for reading:', error)
    // Fallback: start reading with default settings
    startReading(selectedText, undefined, 0.9, 1, 1)
  })
}

// Store selected text and show tooltip
mouseUpHandler = () => {
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
}
document.addEventListener('mouseup', mouseUpHandler)

// Hide tooltip when clicking elsewhere
mouseDownHandler = (e: MouseEvent) => {
  if (selectionTooltip && !selectionTooltip.contains(e.target as Node)) {
    // Only hide if not clicking the tooltip itself
    const selection = window.getSelection()
    if (!selection || selection.toString().trim().length === 0) {
      hideSelectionTooltip()
    }
  }
}
document.addEventListener('mousedown', mouseDownHandler)

// Listen for language changes and settings updates
storageChangeHandler = (changes) => {
  if (changes.selectedLocale) {
    // Reload locale messages and update UI
    loadLocaleMessages().then(() => {
      updateTooltipText()
    })
  }
  if (changes.wordHighlightEnabled) {
    wordHighlightEnabled = (changes.wordHighlightEnabled.newValue as boolean | undefined) ?? true
  }
  if (changes.followHighlight) {
    followHighlight = (changes.followHighlight.newValue as boolean | undefined) ?? false
  }
}
browser.storage.local.onChanged.addListener(storageChangeHandler)

// Keyboard Shortcuts
keydownHandler = (e: KeyboardEvent) => {
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
}
document.addEventListener('keydown', keydownHandler)

// Cleanup function to prevent memory leaks
function cleanup() {
  // Remove all event listeners
  if (mouseUpHandler) {
    document.removeEventListener('mouseup', mouseUpHandler)
    mouseUpHandler = null
  }
  if (mouseDownHandler) {
    document.removeEventListener('mousedown', mouseDownHandler)
    mouseDownHandler = null
  }
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (rifmActionHandler) {
    window.removeEventListener('rifm-action', rifmActionHandler as EventListener)
    rifmActionHandler = null
  }
  if (storageChangeHandler) {
    browser.storage.local.onChanged.removeListener(storageChangeHandler)
    storageChangeHandler = null
  }
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel()
  
  // Clear all timeouts and intervals
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout)
    autoHideTimeout = null
  }
  if (tooltipHideTimeout) {
    clearTimeout(tooltipHideTimeout)
    tooltipHideTimeout = null
  }
  if (highlightFadeoutTimeout) {
    clearTimeout(highlightFadeoutTimeout)
    highlightFadeoutTimeout = null
  }
  
  // Remove DOM elements
  if (selectionTooltip) {
    if (selectionTooltipClickHandler) {
      selectionTooltip.removeEventListener('click', selectionTooltipClickHandler)
      selectionTooltipClickHandler = null
    }
    selectionTooltip.remove()
    selectionTooltip = null
  }
  if (currentHighlightElement) {
    clearWordHighlight(false)
  }
  
  // Destroy floating player
  destroyPlayer()
  
  // Remove beforeunload listener
  if (beforeunloadHandler) {
    window.removeEventListener('beforeunload', beforeunloadHandler)
    beforeunloadHandler = null
  }
  
  // Reset state
  readingQueue = []
  queuedSelectionRanges = []
  isReading = false
  isPaused = false
  currentUtterance = null
  currentReadingText = ''
  originalSelectionRange = null
}

// Listen for page unload to cleanup
beforeunloadHandler = cleanup
window.addEventListener('beforeunload', beforeunloadHandler)

