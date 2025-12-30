import { useState, useEffect, useCallback } from 'react'
import type { StorageData } from '../../types'
import browser from '../../utils/browser'

/**
 * Custom hook to manage Chrome storage with type safety
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Tuple of [value, setValue, isLoading]
 */
export function useStorage<K extends keyof StorageData>(
  key: K,
  defaultValue: StorageData[K]
) {
  const [value, setValue] = useState<StorageData[K]>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)

  // Load value from storage on mount
  useEffect(() => {
    browser.storage.local.get([key]).then((result) => {
      const value = result[key]
      if (value !== undefined) {
        setValue(value as StorageData[K])
      }
      setIsLoading(false)
    }).catch((error) => {
      console.error(`Failed to load ${String(key)} from storage:`, error)
      setIsLoading(false)
    })
  }, [key])

  // Update storage when value changes
  const setStoredValue = useCallback((newValue: StorageData[K]) => {
    setValue(newValue)
    browser.storage.local.set({ [key]: newValue })
  }, [key])

  return [value, setStoredValue, isLoading] as const
}

/**
 * Custom hook to manage multiple storage keys at once
 * @param keys - Array of storage keys
 * @returns Object with values and setters
 */
export function useMultipleStorage<K extends keyof StorageData>(keys: K[]) {
  const [values, setValues] = useState<Partial<StorageData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const keysString = keys.join(',')

  useEffect(() => {
    browser.storage.local.get(keys).then((result) => {
      setValues(result)
      setIsLoading(false)
    }).catch((error) => {
      console.error('Failed to load multiple storage keys:', error)
      setIsLoading(false)
    })
  }, [keysString, keys])

  const updateValue = useCallback(<T extends K>(key: T, value: StorageData[T]) => {
    setValues(prev => ({ ...prev, [key]: value }))
    browser.storage.local.set({ [key]: value })
  }, [])

  return { values, updateValue, isLoading }
}
