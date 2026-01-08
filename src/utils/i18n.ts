// i18n utility for Chrome extension
import browser from './browser'

let messagesCache: { [key: string]: any } = {}

// Available locales
export const availableLocales = [
  { code: 'en', name: 'langEnglish' },
  { code: 'pt_BR', name: 'langPortuguese' },
  { code: 'es', name: 'langSpanish' },
  { code: 'fr', name: 'langFrench' },
  { code: 'de', name: 'langGerman' },
  { code: 'ja', name: 'langJapanese' },
  { code: 'zh_CN', name: 'langChinese' }
]

// Load messages for a specific locale
async function loadMessages(locale: string): Promise<void> {
  try {
    const response = await fetch(browser.runtime.getURL(`_locales/${locale}/messages.json`))
    messagesCache = await response.json()
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error)
    // Fallback to English
    if (locale !== 'en') {
      await loadMessages('en')
    }
  }
}

/**
 * Maps browser language codes to available extension locales
 * Handles various formats like 'en-US', 'pt-BR', 'zh-CN', 'ja', etc.
 */
function mapBrowserLanguageToLocale(browserLang: string): string {
  // Normalize the language code
  const normalized = browserLang.toLowerCase().replace('-', '_')
  
  // Try exact match first
  const exactMatch = availableLocales.find(l => l.code.toLowerCase() === normalized)
  if (exactMatch) return exactMatch.code
  
  // Try matching just the language part (before underscore/dash)
  const langCode = normalized.split('_')[0]
  
  // Special cases for common mappings
  const languageMap: Record<string, string> = {
    'pt': 'pt_BR',    // Portuguese -> Brazilian Portuguese
    'zh': 'zh_CN',    // Chinese -> Simplified Chinese
    'en': 'en',       // English
    'es': 'es',       // Spanish
    'fr': 'fr',       // French
    'de': 'de',       // German
    'ja': 'ja',       // Japanese
  }
  
  // Check if we have a mapping for this language
  if (languageMap[langCode]) {
    return languageMap[langCode]
  }
  
  // Try finding a locale that starts with this language code
  const partialMatch = availableLocales.find(l => 
    l.code.toLowerCase().startsWith(langCode)
  )
  if (partialMatch) return partialMatch.code
  
  // Default to English if no match found
  return 'en'
}

// Get current locale from storage or browser
export async function initializeLocale(): Promise<string> {
  const result = await browser.storage.local.get(['selectedLocale'])
  try {
    let locale = result.selectedLocale as string | undefined
    
    if (!locale) {
      // Use browser's default language
      const browserLang = browser.i18n.getUILanguage()
      locale = mapBrowserLanguageToLocale(browserLang)
      
      console.log(`Browser language detected: ${browserLang}, using locale: ${locale}`)
    }
    
    await loadMessages(locale)
    return locale
  } catch (error) {
    console.error('Failed to initialize locale:', error)
    await loadMessages('en')
    return 'en'
  }
}

// Set and save locale
export async function setLocale(locale: string): Promise<void> {
  await loadMessages(locale)
  await browser.storage.local.set({ selectedLocale: locale })
}

// Get translated message
export function getMessage(messageName: string, substitutions?: string | string[]): string {
  // If we have cached messages, use them
  if (messagesCache[messageName]) {
    let message = messagesCache[messageName].message
    
    // Handle substitutions
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
      subs.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub)
      })
    }
    
    return message
  }
  
  // Fallback to browser's i18n API if available
  try {
    if (browser?.i18n) {
      return browser.i18n.getMessage(messageName, substitutions) || messageName
    }
  } catch (e) {
    // browser API might not be available in all contexts
  }
  
  return messageName
}

// Shorthand alias
export const t = getMessage

