import { useEffect, useState } from 'react'
import type { ThemeMode } from '../../types'
import browser from '../../utils/browser'

/**
 * Custom hook to manage theme (light/dark/auto) with persistence
 * Includes smooth transitions and prevents flash on load
 * @returns Theme state and setter function
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('auto')
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const applyTheme = (themeMode: ThemeMode) => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = themeMode === 'dark' || (themeMode === 'auto' && prefersDark)

    root.classList.toggle('dark', shouldUseDark)
  }

  // Apply theme to DOM with smooth transitions
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Disable transitions on first load to prevent flash
    if (isInitialLoad) {
      root.classList.add('no-transitions')
    }

    applyTheme(theme)

    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme('auto')
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    // Re-enable transitions after first render
    if (isInitialLoad) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.remove('no-transitions')
          setIsInitialLoad(false)
        })
      })
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme, isInitialLoad])

  // Load theme from storage on mount
  useEffect(() => {
    browser.storage.local
      .get(['theme'])
      .then((result) => {
        const storedTheme = result.theme as ThemeMode | undefined
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
          setTheme(storedTheme)
          return
        }

        setTheme('auto')
        browser.storage.local.set({ theme: 'auto' })
      })
      .catch((error) => {
        console.error('Failed to load theme from storage:', error)
      })
  }, [])

  // Persist theme when it changes
  const setThemeWithPersistence = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    browser.storage.local.set({ theme: newTheme })
  }

  return [theme, setThemeWithPersistence] as const
}
