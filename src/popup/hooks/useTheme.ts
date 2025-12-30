import { useState, useEffect } from 'react'
import type { ThemeMode } from '../../types'
import browser from '../../utils/browser'

/**
 * Custom hook to manage theme (light/dark/auto) with persistence
 * @returns Theme state and setter function
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('auto')

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

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
