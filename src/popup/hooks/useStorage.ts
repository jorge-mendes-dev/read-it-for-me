import { useState, useEffect, useCallback } from 'react'
import type { StorageData } from '../../types'

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
    chrome.storage.local.get([key], (result) => {
      if (result[key] !== undefined) {
        setValue(result[key])
      }
      setIsLoading(false)
    })
  }, [key])

  // Update storage when value changes
  const setStoredValue = useCallback((newValue: StorageData[K]) => {
    setValue(newValue)
    chrome.storage.local.set({ [key]: newValue })
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

  useEffect(() => {
    chrome.storage.local.get(keys, (result) => {
      setValues(result)
      setIsLoading(false)
    })
  }, [keys.join(',')])

  const updateValue = useCallback(<T extends K>(key: T, value: StorageData[T]) => {
    setValues(prev => ({ ...prev, [key]: value }))
    chrome.storage.local.set({ [key]: value })
  }, [])

  return { values, updateValue, isLoading }
}
