import { useEffect, useState } from 'react'
import type { ThemeMode } from '../../types'
import browser from '../../utils/browser'

/**
 * Custom hook to manage theme (light/dark/auto) with persistence
 * Includes smooth transitions and prevents flash on load
 * @returns Theme state and setter function
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Apply theme to DOM with smooth transitions
  useEffect(() => {
    const root = document.documentElement

    // Disable transitions on first load to prevent flash
    if (isInitialLoad) {
      root.classList.add('no-transitions')
    }

    // The popup is intentionally dark-only for design-system consistency.
    root.classList.add('dark')

    // Re-enable transitions after first render
    if (isInitialLoad) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.remove('no-transitions')
          setIsInitialLoad(false)
        })
      })
    }
  }, [theme, isInitialLoad])

  // Load theme from storage on mount
  useEffect(() => {
    browser.storage.local
      .get(['theme'])
      .then(() => {
        setTheme('dark')
        browser.storage.local.set({ theme: 'dark' })
      })
      .catch((error) => {
        console.error('Failed to load theme from storage:', error)
      })
  }, [])

  // Persist theme when it changes
  const setThemeWithPersistence = (newTheme: ThemeMode) => {
    void newTheme
    setTheme('dark')
    browser.storage.local.set({ theme: 'dark' })
  }

  return [theme, setThemeWithPersistence] as const
}
