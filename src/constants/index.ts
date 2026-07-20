/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers and strings
 */

// Default TTS settings
export const DEFAULTS = {
  VOICE_INDEX: 0,
  RATE: 0.9,
  PITCH: 1,
  VOLUME: 1,
} as const

// UI Configuration
export const UI_CONFIG = {
  RECENT_VOICES_LIMIT: 5,
  LOGO_SIZE: 14, // rem units
  SAVE_FEEDBACK_DURATION: 2000, // ms
  DEBOUNCE_DELAY: 300, // ms
} as const

// Voice Quality Thresholds
export const VOICE_QUALITY = {
  PREMIUM_THRESHOLD: 70, // Score threshold for ⚡ indicator
  NEURAL_SCORE: 100,
  PREMIUM_SCORE: 90,
  ENHANCED_SCORE: 80,
  NATURAL_SCORE: 70,
} as const

// Playback Speed Presets
export const SPEED_PRESETS = [0.75, 0.9, 1.0, 1.25, 1.5] as const

// Animation Durations (ms)
export const ANIMATION = {
  FADE_IN: 300,
  SLIDE: 300,
  SCALE: 200,
  PULSE_SLOW: 3000,
  TRANSITION_FAST: 150,
  TRANSITION_NORMAL: 250,
  TRANSITION_SLOW: 350,
} as const

// Z-Index Layers
export const Z_INDEX = {
  MODAL: 50,
  FLOATING_PLAYER: 999999,
  TOOLTIP: 1000,
} as const

// Progress Update Interval
export const PROGRESS_UPDATE_INTERVAL = 100 // ms

// Estimated Words Per Minute (for time calculations)
export const WORDS_PER_MINUTE = 150

// Storage Keys
export const STORAGE_KEYS = {
  DEFAULT_VOICE_INDEX: 'defaultVoiceIndex',
  DEFAULT_RATE: 'defaultRate',
  DEFAULT_PITCH: 'defaultPitch',
  DEFAULT_VOLUME: 'defaultVolume',
  RECENT_VOICES: 'recentVoices',
  SHOW_PROGRESS_BAR: 'showProgressBar',
  AUTO_SELECT_VOICE: 'autoSelectVoice',
  AUTO_SELECTED_VOICE: 'autoSelectedVoice',
  HAS_SEEN_WELCOME: 'hasSeenWelcome',
  SELECTED_LOCALE: 'selectedLocale',
  THEME: 'theme',
  HOTKEYS_ENABLED: 'hotkeysEnabled',
} as const

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  READ_SELECTION: { ctrl: true, shift: true, key: 'Y' },
  PAUSE_RESUME: { key: 'Space' },
  STOP: { key: 'Escape' },
} as const
