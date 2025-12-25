// i18n utility for Chrome extension
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
    const response = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`))
    messagesCache = await response.json()
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error)
    // Fallback to English
    if (locale !== 'en') {
      await loadMessages('en')
    }
  }
}

// Get current locale from storage or browser
export async function initializeLocale(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedLocale'], async (result) => {
      let locale = result.selectedLocale
      
      if (!locale) {
        // Use browser's default language
        const browserLang = chrome.i18n.getUILanguage().replace('-', '_')
        // Check if we have this locale
        locale = availableLocales.find(l => l.code === browserLang)?.code || 'en'
      }
      
      await loadMessages(locale)
      resolve(locale)
    })
  })
}

// Set and save locale
export async function setLocale(locale: string): Promise<void> {
  await loadMessages(locale)
  chrome.storage.local.set({ selectedLocale: locale })
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
  
  // Fallback to Chrome's i18n API
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    return chrome.i18n.getMessage(messageName, substitutions) || messageName
  }
  
  return messageName
}

// Shorthand alias
export const t = getMessage

