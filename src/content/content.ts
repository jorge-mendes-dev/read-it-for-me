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
let tooltipShowTimeout: number | null = null // Track tooltip show timeout
let lastHighlightCharIndex: number = -1 // Track the character position of the last highlight
let wordHighlightEnabled: boolean = true // Track if word highlighting is enabled
let followHighlight: boolean = false // Track if auto-scroll to highlighted words is enabled
let smartReadEnabled: boolean = false // Track if smart read feature is enabled
let pausedAt: number = 0 // Track character position when paused for recovery
let pauseCheckInterval: number | null = null // Check if speech stopped during pause

// Event handler references for cleanup
let mouseUpHandler: (() => void) | null = null
let mouseDownHandler: ((e: MouseEvent) => void) | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
let rifmActionHandler: ((event: CustomEvent) => void) | null = null
let storageChangeHandler: ((changes: any) => void) | null = null
let beforeunloadHandler: (() => void) | null = null
let selectionTooltipClickHandler: (() => void) | null = null
let smartReadButton: HTMLButtonElement | null = null
let smartReadButtonClickHandler: (() => void) | null = null
let isCreatingSmartReadButton = false

// Ensure voices are loaded
function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
    } else {
      const handler = () => {
        const loadedVoices = window.speechSynthesis.getVoices()
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        resolve(loadedVoices)
      }
      window.speechSynthesis.addEventListener('voiceschanged', handler)
    }
  })
}

// Queue system for reading requests
let readingQueue: ReadingRequest[] = []
let queuedSelectionRanges: (Range | null)[] = [] // Store selection ranges for each queue item

// Function to process next item in queue
function processNextInQueue() {
  if (readingQueue.length === 0) {
    // Queue is empty - finish reading
    isReading = false
    isPaused = false
    currentUtterance = null
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    updateState()
    
    // Show smart read button again if enabled
    showSmartReadButtonIfNeeded()
    
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

// Function to start reading
function startReading(text: string, voiceIndex: number | undefined, rate: number, pitch: number, volume: number, savedRange?: Range | null) {
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout)
    autoHideTimeout = null
  }
  
  const processedText = preprocessText(text)
  const utterance = new SpeechSynthesisUtterance(processedText)
  
  const wordsPerMinute = 150 * (rate || 1)
  const words = processedText.split(/\s+/).length
  const estimatedSeconds = (words / wordsPerMinute) * 60
  updateTimeEstimate(estimatedSeconds)
  
  const voices = window.speechSynthesis.getVoices()
  
  if (voices.length === 0) {
    console.error('No speech synthesis voices available')
    isReading = false
    isPaused = false
    currentUtterance = null
    updateState()
    return
  }
  
  if (voiceIndex !== undefined && voices[voiceIndex]) {
    utterance.voice = voices[voiceIndex]
  } else {
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

  currentReadingText = processedText
  lastHighlightCharIndex = -1
  
  if (savedRange === null) {
    originalSelectionRange = null
  } else if (savedRange) {
    originalSelectionRange = savedRange
  } else {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      originalSelectionRange = selection.getRangeAt(0).cloneRange()
    } else {
      originalSelectionRange = null
    }
  }

  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name === 'word' && event.charIndex !== undefined) {
      highlightCurrentWord(event.charIndex)
    }
  }

  startTime = Date.now()
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  progressInterval = window.setInterval(() => {
    if (!isReading || isPaused) return
    const elapsed = (Date.now() - startTime) / 1000
    const estimated = estimatedSeconds
    const cappedElapsed = Math.min(elapsed, estimated)
    updateProgress(cappedElapsed, estimated)
  }, 100)

  utterance.onend = () => {
    clearWordHighlight()
    originalSelectionRange = null
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
    originalSelectionRange = null
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
    'clearQueue': 'Clear Queue',
    'readFullArticle': 'Read Full Article'
  }
  return fallbacks[key] || key
}

// Initialize locale on load
loadLocaleMessages().then(() => {
  // Create tooltip after locale is loaded
  createSelectionTooltip()
  // Ensure tooltip has correct text
  updateTooltipText()
  
  // Load smart read setting and create button if enabled
  browser.storage.local.get(['smartRead']).then((result) => {
    smartReadEnabled = (result.smartRead as boolean | undefined) ?? false
    
    // Initialize smart read button if enabled (after locale is loaded)
    if (smartReadEnabled) {
      detectAndShowSmartReadButton()
    }
  }).catch((error) => {
    console.error('[ContentScript] Failed to load smart read setting:', error)
  })
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
    
    const selection = window.getSelection()
    const selectionRange = (selection && selection.rangeCount > 0) 
      ? selection.getRangeAt(0).cloneRange() 
      : null
    
    if (isReading && !isPaused) {
      readingQueue.push({ text, voiceIndex, rate, pitch, volume })
      queuedSelectionRanges.push(selectionRange)
      showPlayer().then(() => updateQueueCount(readingQueue.length))
      return Promise.resolve({ success: true, queued: true })
    } else {
      if (currentUtterance) {
        currentUtterance.onend = null
        currentUtterance.onerror = null
        window.speechSynthesis.cancel()
      }
      clearWordHighlight()
      originalSelectionRange = null
      readingQueue = []
      queuedSelectionRanges = []
      startReading(text, voiceIndex, rate, pitch, volume)
      return Promise.resolve({ success: true, queued: false })
    }
  }

  if (request.action === 'pauseReading') {
    if (isReading && !isPaused) {
      try {
        pausedAt = lastHighlightCharIndex >= 0 ? lastHighlightCharIndex : 0
        window.speechSynthesis.pause()
        isPaused = true
        updatePlayerState(true)
        updateState()
        
        // Monitor if speech gets auto-canceled during pause (browser timeout)
        if (pauseCheckInterval) clearInterval(pauseCheckInterval)
        pauseCheckInterval = window.setInterval(() => {
          if (isPaused && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            // Speech was auto-canceled, prepare for recovery on resume
            console.log('[RIFM] Speech auto-canceled during pause, will restart on resume')
            if (pauseCheckInterval) {
              clearInterval(pauseCheckInterval)
              pauseCheckInterval = null
            }
          }
        }, 1000)
      } catch (error) {
        console.error('Error pausing speech:', error)
      }
    }
    return Promise.resolve({ success: true })
  }

  if (request.action === 'resumeReading') {
    if (isReading && isPaused) {
      try {
        // Clear pause check interval
        if (pauseCheckInterval) {
          clearInterval(pauseCheckInterval)
          pauseCheckInterval = null
        }
        
        // Check if speech was auto-canceled during pause (browser timeout)
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && currentUtterance) {
          console.log('[RIFM] Restarting speech from position:', pausedAt)
          
          // Extract remaining text from pause point
          const remainingText = currentReadingText.substring(pausedAt)
          if (remainingText.trim()) {
            // Get current settings
            const currentVoice = currentUtterance.voice
            const currentRate = currentUtterance.rate
            const currentPitch = currentUtterance.pitch
            const currentVolume = currentUtterance.volume
            const savedRange = originalSelectionRange
            
            // Clear current utterance
            currentUtterance.onend = null
            currentUtterance.onerror = null
            window.speechSynthesis.cancel()
            
            // Create new utterance with remaining text
            const newUtterance = new SpeechSynthesisUtterance(remainingText)
            newUtterance.voice = currentVoice
            newUtterance.rate = currentRate
            newUtterance.pitch = currentPitch
            newUtterance.volume = currentVolume
            
            // Set up event handlers
            newUtterance.onboundary = (event: SpeechSynthesisEvent) => {
              if (event.name === 'word' && event.charIndex !== undefined) {
                // Adjust char index to account for skipped text
                highlightCurrentWord(pausedAt + event.charIndex)
              }
            }
            
            newUtterance.onend = () => {
              clearWordHighlight()
              originalSelectionRange = null
              if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
              }
              processNextInQueue()
            }
            
            newUtterance.onerror = (event: SpeechSynthesisErrorEvent) => {
              console.error('Speech synthesis error:', event.error, event)
              clearWordHighlight()
              originalSelectionRange = null
              if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
              }
              processNextInQueue()
            }
            
            // Restore selection range
            originalSelectionRange = savedRange
            currentUtterance = newUtterance
            window.speechSynthesis.speak(newUtterance)
            isPaused = false
            pausedAt = 0
            updatePlayerState(false)
            updateState()
          } else {
            // No remaining text, just finish
            processNextInQueue()
          }
        } else {
          // Normal resume
          window.speechSynthesis.resume()
          isPaused = false
          pausedAt = 0
          updatePlayerState(false)
          updateState()
        }
      } catch (error) {
        console.error('Error resuming speech:', error)
      }
    }
    return Promise.resolve({ success: true })
  }

  if (request.action === 'stopReading') {
    clearWordHighlight()
    originalSelectionRange = null
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
    }
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

  return Promise.resolve(null)
});

// Listen for custom events from floating player (same context)
rifmActionHandler = (event: CustomEvent) => {
  const { action } = event.detail
  
  if (action === 'stopReading') {
    if (autoHideTimeout !== null) {
      clearTimeout(autoHideTimeout)
      autoHideTimeout = null
    }
    clearWordHighlight()
    originalSelectionRange = null
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
    }
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
    
    showSmartReadButtonIfNeeded()
  }
  
  if (action === 'togglePlayPause') {
    if (isPaused) {
      try {
        // Clear pause check interval
        if (pauseCheckInterval) {
          clearInterval(pauseCheckInterval)
          pauseCheckInterval = null
        }
        
        // Check if speech was auto-canceled during pause
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && currentUtterance) {
          console.log('[RIFM] Restarting speech from position:', pausedAt)
          
          const remainingText = currentReadingText.substring(pausedAt)
          if (remainingText.trim()) {
            const currentVoice = currentUtterance.voice
            const currentRate = currentUtterance.rate
            const currentPitch = currentUtterance.pitch
            const currentVolume = currentUtterance.volume
            const savedRange = originalSelectionRange
            
            currentUtterance.onend = null
            currentUtterance.onerror = null
            window.speechSynthesis.cancel()
            
            const newUtterance = new SpeechSynthesisUtterance(remainingText)
            newUtterance.voice = currentVoice
            newUtterance.rate = currentRate
            newUtterance.pitch = currentPitch
            newUtterance.volume = currentVolume
            
            newUtterance.onboundary = (event: SpeechSynthesisEvent) => {
              if (event.name === 'word' && event.charIndex !== undefined) {
                highlightCurrentWord(pausedAt + event.charIndex)
              }
            }
            
            newUtterance.onend = () => {
              clearWordHighlight()
              originalSelectionRange = null
              if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
              }
              processNextInQueue()
            }
            
            newUtterance.onerror = (event: SpeechSynthesisErrorEvent) => {
              console.error('Speech synthesis error:', event.error, event)
              clearWordHighlight()
              originalSelectionRange = null
              if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
              }
              processNextInQueue()
            }
            
            originalSelectionRange = savedRange
            currentUtterance = newUtterance
            window.speechSynthesis.speak(newUtterance)
            isPaused = false
            pausedAt = 0
            updatePlayerState(false)
            updateState()
          } else {
            processNextInQueue()
          }
        } else {
          // Normal resume
          window.speechSynthesis.resume()
          isPaused = false
          pausedAt = 0
          updatePlayerState(false)
          updateState()
        }
      } catch (error) {
        console.error('Error resuming speech:', error)
      }
    } else if (isReading) {
      try {
        pausedAt = lastHighlightCharIndex >= 0 ? lastHighlightCharIndex : 0
        window.speechSynthesis.pause()
        isPaused = true
        updatePlayerState(true)
        updateState()
        
        // Monitor for auto-cancel
        if (pauseCheckInterval) clearInterval(pauseCheckInterval)
        pauseCheckInterval = window.setInterval(() => {
          if (isPaused && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            console.log('[RIFM] Speech auto-canceled during pause, will restart on resume')
            if (pauseCheckInterval) {
              clearInterval(pauseCheckInterval)
              pauseCheckInterval = null
            }
          }
        }, 1000)
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
  console.log('[RIFM] Selection tooltip created and event listener attached')
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
// Score a voice based on quality indicators
function scoreVoice(voice: SpeechSynthesisVoice, fullLangCode: string): number {
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

// Get best voice for language - kept for potential future use
// @ts-ignore - unused but may be needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  if (!selectedText) {
    console.log('[RIFM] No text selected')
    return
  }

  console.log('[RIFM] Reading selected text:', selectedText.substring(0, 50) + '...')
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
        // Sort voices by score and pick the best
        const rankedVoices = matchingVoices
          .map(voice => ({ voice, score: scoreVoice(voice, fullLangCode) }))
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
      // Clear queue and start new reading
      readingQueue = []
      queuedSelectionRanges = []
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
  // Clear any pending tooltip timeout to prevent race condition
  if (tooltipShowTimeout !== null) {
    clearTimeout(tooltipShowTimeout)
    tooltipShowTimeout = null
  }
  
  // Small delay to ensure selection is complete
  tooltipShowTimeout = window.setTimeout(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString()
    
    if (selectedText && selectedText.trim().length > 0) {
      browser.storage.local.set({ lastSelectedText: selectedText })
      showSelectionTooltip()
    } else {
      hideSelectionTooltip()
    }
    tooltipShowTimeout = null
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
      // Small delay to ensure messages are fully loaded
      setTimeout(() => {
        updateTooltipText()
        if (smartReadButton) {
          updateSmartReadButtonText()
        }
      }, 50)
    })
  }
  if (changes.wordHighlightEnabled) {
    wordHighlightEnabled = (changes.wordHighlightEnabled.newValue as boolean | undefined) ?? true
  }
  if (changes.followHighlight) {
    followHighlight = (changes.followHighlight.newValue as boolean | undefined) ?? false
  }
  if (changes.smartRead) {
    smartReadEnabled = (changes.smartRead.newValue as boolean | undefined) ?? false
    if (smartReadEnabled) {
      detectAndShowSmartReadButton()
    } else {
      hideSmartReadButton()
    }
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

// Smart Read Feature - Detect and show button for full article reading
function detectArticleContent(): { text: string; element: Element } | null {
  // Helper to check if element should be excluded
  const shouldExcludeElement = (element: Element): boolean => {
    const tagName = element.tagName.toLowerCase()
    const className = element.className.toString().toLowerCase()
    const id = element.id.toLowerCase()
    
    // Exclude navigation, headers, footers, sidebars, ads, etc.
    const excludedTags = ['nav', 'header', 'footer', 'aside', 'script', 'style', 'iframe', 'form', 'button']
    if (excludedTags.includes(tagName)) return true
    
    // Exclude by class/id keywords
    const excludedKeywords = [
      'nav', 'menu', 'sidebar', 'header', 'footer', 'advertisement', 'ad-',
      'cookie', 'banner', 'popup', 'modal', 'comment', 'share', 'social',
      'related', 'recommend', 'widget', 'promo', 'sponsored', 'subscribe'
    ]
    
    for (const keyword of excludedKeywords) {
      if (className.includes(keyword) || id.includes(keyword)) {
        return true
      }
    }
    
    return false
  }
  
  // Helper to extract clean text from element
  const getCleanText = (element: Element): string => {
    const clone = element.cloneNode(true) as Element
    
    // Remove script, style, and excluded elements from clone
    const toRemove = clone.querySelectorAll('script, style, nav, header, footer, aside, iframe, form, button, [class*="nav"], [class*="menu"], [class*="sidebar"], [class*="comment"], [class*="ad-"], [class*="share"]')
    toRemove.forEach(el => el.remove())
    
    return clone.textContent?.trim() || ''
  }
  
  // Try common article selectors with clean text extraction
  const articleSelectors = [
    'article[role="article"]',
    'article',
    '[role="article"]',
    'main article',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.article-body',
    '.story-body',
    'main .content'
  ]
  
  for (const selector of articleSelectors) {
    const elements = document.querySelectorAll(selector)
    for (const element of elements) {
      if (shouldExcludeElement(element)) continue
      
      const text = getCleanText(element)
      // Check if it has substantial content (more than 500 characters)
      if (text && text.length > 500) {
        return { text, element }
      }
    }
  }
  
  // Fallback: Find element with highest text density in main content
  const mainContent = document.querySelector('main') || document.body
  const candidates = mainContent.querySelectorAll<HTMLElement>('article, section, div[class*="content"], div[class*="article"], div[class*="post"]')
  
  let bestElement: HTMLElement | null = null
  let bestScore = 0
  
  // Limit search to first 50 candidates for performance
  const maxCandidates = Math.min(candidates.length, 50)
  for (let i = 0; i < maxCandidates; i++) {
    const element = candidates[i]
    
    // Skip excluded elements
    if (shouldExcludeElement(element)) continue
    
    // Skip elements that are too small
    const rect = element.getBoundingClientRect()
    if (rect.width < 200 || rect.height < 100) continue
    
    const cleanText = getCleanText(element)
    if (cleanText.length < 500) continue
    
    // Calculate score based on text length and paragraph count
    const paragraphs = element.querySelectorAll('p').length
    const textLength = cleanText.length
    
    // Prefer elements with more paragraphs and longer text
    const score = textLength + (paragraphs * 100)
    
    if (score > bestScore) {
      bestScore = score
      bestElement = element
    }
  }
  
  if (bestElement) {
    return { text: getCleanText(bestElement), element: bestElement }
  }
  
  return null
}

// Helper to create a range from an element
function createRangeFromElement(element: Element): Range | null {
  try {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range
  } catch (e) {
    console.debug('[RIFM] Could not create range from element:', e)
    return null
  }
}

function createSmartReadButton() {
  if (smartReadButton) return
  
  smartReadButton = document.createElement('button')
  smartReadButton.id = 'rifm-smart-read-button'
  
  // Create style element
  const style = document.createElement('style')
  style.textContent = `
    #rifm-smart-read-button {
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
      color: white !important;
      border: none !important;
      border-radius: 50px !important;
      padding: 14px 24px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      z-index: 2147483645 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      user-select: none !important;
      backdrop-filter: blur(10px) !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      transform: translateY(100px) scale(0.8) !important;
    }
    
    #rifm-smart-read-button.show {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
    }
    
    @media (prefers-color-scheme: dark) {
      #rifm-smart-read-button {
        background: linear-gradient(135deg, #4f52dd 0%, #7748e2 100%) !important;
        box-shadow: 0 4px 12px rgba(79, 82, 221, 0.5) !important;
      }
    }
    
    #rifm-smart-read-button:hover {
      transform: translateY(-2px) scale(1.05) !important;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.6) !important;
    }
    
    #rifm-smart-read-button:active {
      transform: translateY(0) scale(0.98) !important;
    }
    
    #rifm-smart-read-button svg {
      width: 18px !important;
      height: 18px !important;
      stroke: white !important;
      fill: none !important;
      flex-shrink: 0 !important;
    }
    
    @media (prefers-reduced-motion: reduce) {
      #rifm-smart-read-button {
        transition: none !important;
        animation: none !important;
      }
    }
  `
  
  // Create SVG icon
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('d', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')
  
  svg.appendChild(path)
  
  // Create text span
  const textSpan = document.createElement('span')
  textSpan.id = 'rifm-smart-read-text'
  textSpan.textContent = getMessage('readFullArticle')
  
  // Assemble button
  smartReadButton.appendChild(svg)
  smartReadButton.appendChild(textSpan)
  
  // Add click handler BEFORE appending to DOM
  smartReadButtonClickHandler = handleSmartRead
  smartReadButton.addEventListener('click', smartReadButtonClickHandler)
  
  // Append style and button to document
  if (!document.getElementById('rifm-smart-read-styles')) {
    style.id = 'rifm-smart-read-styles'
    document.head.appendChild(style)
  }
  document.body.appendChild(smartReadButton)
  
  // Animate in
  setTimeout(() => {
    smartReadButton?.classList.add('show')
  }, 100)
}

function updateSmartReadButtonText() {
  if (!smartReadButton) return
  const textSpan = document.querySelector('#rifm-smart-read-text') as HTMLElement
  if (textSpan) {
    const translatedText = getMessage('readFullArticle')
    textSpan.textContent = translatedText
  }
}

function hideSmartReadButton() {
  if (!smartReadButton) return
  
  smartReadButton.classList.remove('show')
  setTimeout(() => {
    if (smartReadButton) {
      if (smartReadButtonClickHandler) {
        smartReadButton.removeEventListener('click', smartReadButtonClickHandler)
        smartReadButtonClickHandler = null
      }
      smartReadButton.remove()
      smartReadButton = null
    }
  }, 300)
}

function detectAndShowSmartReadButton() {
  // Only show if article content is detected and not already creating
  if (isCreatingSmartReadButton || smartReadButton) return
  
  const articleContent = detectArticleContent()
  if (articleContent) {
    isCreatingSmartReadButton = true
    createSmartReadButton()
    isCreatingSmartReadButton = false
  }
}

// Helper to show smart read button after reading completes
function showSmartReadButtonIfNeeded() {
  // Check if smart read is enabled
  browser.storage.local.get(['smartRead']).then((result) => {
    const smartReadEnabled = result.smartRead as boolean | undefined
    if (smartReadEnabled) {
      // Small delay to ensure reading state is settled
      setTimeout(() => {
        detectAndShowSmartReadButton()
      }, 100)
    }
  })
}

function handleSmartRead() {
  const articleContent = detectArticleContent()
  if (!articleContent) {
    console.warn('[RIFM] No article content detected')
    return
  }
  
  const { text: articleText, element: articleElement } = articleContent
  const articleRange = createRangeFromElement(articleElement)
  
  hideSmartReadButton()

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
    return detectLanguageFromText(articleText)
  }

  // Get saved voice settings (using same logic as handleSelectionRead)
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
        // Sort voices by score and pick the best
        const rankedVoices = matchingVoices
          .map(voice => ({ voice, score: scoreVoice(voice, fullLangCode) }))
          .sort((a, b) => b.score - a.score)
        
        const bestVoice = rankedVoices[0].voice
        voiceIndex = voices.indexOf(bestVoice)
        
        // Save the auto-selected voice so the popup can update
        browser.storage.local.set({ autoSelectedVoice: voiceIndex })
      }
    }

    // Add to queue if already reading, otherwise start immediately
    if (isReading && !isPaused) {
      readingQueue.push({ text: articleText, voiceIndex, rate, pitch, volume })
      queuedSelectionRanges.push(articleRange) // Article range for highlighting
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
      // Pass article range for word highlighting
      startReading(articleText, voiceIndex, rate, pitch, volume, articleRange)
    }
  }).catch((error) => {
    console.error('Failed to load voice settings for smart read:', error)
    // Fallback: start reading with default settings and article range
    startReading(articleText, undefined, 0.9, 1, 1, articleRange)
  })
}

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
  if (currentUtterance) {
    currentUtterance.onend = null
    currentUtterance.onerror = null
  }
  window.speechSynthesis.cancel()
  
  // Clear all timeouts and intervals
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  if (pauseCheckInterval) {
    clearInterval(pauseCheckInterval)
    pauseCheckInterval = null
  }
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout)
    autoHideTimeout = null
  }
  if (tooltipShowTimeout) {
    clearTimeout(tooltipShowTimeout)
    tooltipShowTimeout = null
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
  if (smartReadButton) {
    if (smartReadButtonClickHandler) {
      smartReadButton.removeEventListener('click', smartReadButtonClickHandler)
      smartReadButtonClickHandler = null
    }
    smartReadButton.remove()
    smartReadButton = null
  }
  
  // Remove smart read styles
  const smartReadStyles = document.getElementById('rifm-smart-read-styles')
  if (smartReadStyles) {
    smartReadStyles.remove()
  }
  
  isCreatingSmartReadButton = false
  
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

