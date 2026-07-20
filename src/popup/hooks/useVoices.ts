import { useEffect, useRef, useState } from 'react'

/**
 * Custom hook to load and manage speech synthesis voices
 * Handles Chrome's quirks where voices load asynchronously in multiple stages:
 * - First batch: local/offline voices
 * - Second batch: Google network voices (require internet)
 *
 * Also implements retry/polling for Chrome popup context where
 * speechSynthesis may not be immediately available.
 *
 * @returns Object with voices array, loading state, and voice metadata
 */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [loadAttempts, setLoadAttempts] = useState(0)
  const [hasNetworkVoices, setHasNetworkVoices] = useState(false)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const voicesLoadedOnceRef = useRef(false)

  useEffect(() => {
    // In Chrome, voices load in stages. We need to handle:
    // 1. getVoices() returning empty on first call (very common in Chrome)
    // 2. Network voices loading after local voices
    // 3. The popup context where speechSynthesis may be delayed

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()

      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        setIsLoadingVoices(false)
        voicesLoadedOnceRef.current = true

        // Check if we have Google network voices (indicates Chrome with internet)
        const hasGoogle = availableVoices.some(
          (v) => v.name.toLowerCase().includes('google') && !v.localService
        )
        setHasNetworkVoices(hasGoogle)

        // In Chrome, more voices may arrive after the first batch
        // Keep listening for voiceschanged to capture network voices
        setLoadAttempts((prev) => prev + 1)
      }

      return availableVoices.length
    }

    // Try to load immediately
    const initialCount = loadVoices()

    // Listen for voiceschanged event
    // Chrome fires this when voices become available AND when new voices load
    const handleVoicesChanged = () => {
      const newVoices = window.speechSynthesis.getVoices()
      if (newVoices.length > 0) {
        setVoices(newVoices)
        setIsLoadingVoices(false)
        voicesLoadedOnceRef.current = true

        const hasGoogle = newVoices.some(
          (v) => v.name.toLowerCase().includes('google') && !v.localService
        )
        setHasNetworkVoices(hasGoogle)
        setLoadAttempts((prev) => prev + 1)
      }
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

    // Chrome-specific: If no voices loaded immediately, poll a few times
    // This handles the case where getVoices() returns [] and voiceschanged
    // hasn't fired yet (common in Chrome extension popups)
    if (initialCount === 0) {
      let pollCount = 0
      const maxPolls = 20 // Poll for up to 2 seconds (20 * 100ms)

      pollIntervalRef.current = setInterval(() => {
        pollCount++
        const count = loadVoices()

        if (count > 0 || pollCount >= maxPolls) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          // If still no voices after polling, mark as loaded (empty)
          if (count === 0) {
            setIsLoadingVoices(false)
          }
        }
      }, 100)
    }

    // Chrome network voices can take 1-3 seconds to load after local voices
    // Schedule a final check to ensure we have all available voices
    retryTimeoutRef.current = setTimeout(() => {
      loadVoices()
    }, 3000)

    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  return { voices, isLoadingVoices, loadAttempts, hasNetworkVoices }
}
