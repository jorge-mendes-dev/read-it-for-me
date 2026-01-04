import { useState, useEffect } from 'react'
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

  // Apply theme to DOM with smooth transitions
  useEffect(() => {
    const root = document.documentElement
    
    // Disable transitions on first load to prevent flash
    if (isInitialLoad) {
      root.classList.add('no-transitions')
    }

    // Apply dark mode based on theme setting
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches)
      }
      mediaQuery.addEventListener('change', handleChange)
      
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }

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
    browser.storage.local.get(['theme']).then((result) => {
      if (result.theme) {
        setTheme(result.theme as ThemeMode)
      }
    }).catch((error) => {
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
