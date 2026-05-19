import { useEffect, useState } from 'react'

/**
 * Custom hook to load and manage speech synthesis voices
 * @returns Object with voices array and loading state
 */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        setIsLoadingVoices(false)
      }
    }

    // Try to load immediately
    loadVoices()

    // Listen for voiceschanged event (some browsers load voices asynchronously)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)

    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  return { voices, isLoadingVoices }
}
