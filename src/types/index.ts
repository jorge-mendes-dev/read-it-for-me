/**
 * Common type definitions for the Read It For Me extension
 */

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto'

// Reading queue types
export interface ReadingRequest {
  text: string
  voiceIndex?: number
  rate: number
  pitch: number
  volume: number
}

// Voice scoring and grouping
export interface VoiceWithScore {
  voice: SpeechSynthesisVoice
  index: number
  score: number
}

export interface VoicesByLanguage {
  [language: string]: VoiceWithScore[]
}

// Extension messaging types
export interface MessageRequest {
  action: string
  [key: string]: any
}

export interface StartReadingMessage extends MessageRequest {
  action: 'startReading'
  text: string
  voiceIndex?: number
  rate: number
  pitch: number
  volume: number
}

export interface StateUpdateMessage extends MessageRequest {
  action: 'stateUpdate'
  state: {
    isReading: boolean
    isPaused: boolean
    currentText: string
  }
}

export interface GetSelectedTextMessage extends MessageRequest {
  action: 'getSelectedText'
}

// Chrome storage types
export interface StorageData {
  defaultVoiceIndex?: number
  defaultRate?: number
  defaultPitch?: number
  defaultVolume?: number
  recentVoices?: number[]
  showProgressBar?: boolean
  autoSelectVoice?: boolean
  autoSelectedVoice?: number
  hasSeenWelcome?: boolean
  selectedLocale?: string
  theme?: ThemeMode
}

// Locale types
export interface LocaleOption {
  code: string
  name: string
}

// Voice quality indicators
export type VoiceQuality = 'neural' | 'premium' | 'enhanced' | 'natural' | 'standard'

// Settings section types (empty string represents collapsed state)
export type SettingsSection = 'voice' | 'playback' | 'advanced' | ''
