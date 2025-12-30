/**
 * Get human-readable language/country name from language code
 * @param langCode - Language code (e.g., 'en-US', 'pt-BR')
 * @returns Language name string
 */
export function getLanguageName(langCode: string): string {
  if (!langCode) return 'Unknown'
  
  // Comprehensive language/locale mapping
  const nameMap: { [key: string]: string } = {
    'en': 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
    'en-AU': 'English (Australia)', 'en-CA': 'English (Canada)',
    'en-IN': 'English (India)', 'en-IE': 'English (Ireland)',
    'en-ZA': 'English (South Africa)',
    'pt': 'Portuguese', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)',
    'es': 'Spanish', 'es-ES': 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico)',
    'es-AR': 'Spanish (Argentina)', 'es-CO': 'Spanish (Colombia)',
    'es-CL': 'Spanish (Chile)',
    'fr': 'French', 'fr-FR': 'French (France)', 'fr-CA': 'French (Canada)',
    'fr-BE': 'French (Belgium)', 'fr-CH': 'French (Switzerland)',
    'de': 'German', 'de-DE': 'German (Germany)', 'de-AT': 'German (Austria)',
    'de-CH': 'German (Switzerland)',
    'it': 'Italian', 'it-IT': 'Italian (Italy)',
    'ja': 'Japanese', 'ja-JP': 'Japanese (Japan)',
    'zh': 'Chinese', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
    'zh-HK': 'Chinese (Hong Kong)', 'zh-SG': 'Chinese (Singapore)',
    'ko': 'Korean', 'ko-KR': 'Korean (Korea)',
    'ru': 'Russian', 'ru-RU': 'Russian (Russia)',
    'nl': 'Dutch', 'nl-NL': 'Dutch (Netherlands)', 'nl-BE': 'Dutch (Belgium)',
    'sv': 'Swedish', 'sv-SE': 'Swedish (Sweden)',
    'no': 'Norwegian', 'nb': 'Norwegian', 'nb-NO': 'Norwegian (Bokmål)',
    'nn-NO': 'Norwegian (Nynorsk)',
    'da': 'Danish', 'da-DK': 'Danish (Denmark)',
    'fi': 'Finnish', 'fi-FI': 'Finnish (Finland)',
    'pl': 'Polish', 'pl-PL': 'Polish (Poland)',
    'cs': 'Czech', 'cs-CZ': 'Czech (Czech Republic)',
    'tr': 'Turkish', 'tr-TR': 'Turkish (Turkey)',
    'ar': 'Arabic', 'ar-SA': 'Arabic (Saudi Arabia)', 'ar-AE': 'Arabic (UAE)',
    'he': 'Hebrew', 'he-IL': 'Hebrew (Israel)',
    'el': 'Greek', 'el-GR': 'Greek (Greece)',
    'th': 'Thai', 'th-TH': 'Thai (Thailand)',
    'id': 'Indonesian', 'id-ID': 'Indonesian (Indonesia)',
    'vi': 'Vietnamese', 'vi-VN': 'Vietnamese (Vietnam)',
    'ro': 'Romanian', 'ro-RO': 'Romanian (Romania)',
    'hu': 'Hungarian', 'hu-HU': 'Hungarian (Hungary)',
    'sk': 'Slovak', 'sk-SK': 'Slovak (Slovakia)'
  }
  
  // Try exact match first
  if (nameMap[langCode]) {
    return nameMap[langCode]
  }
  
  // Fallback to basic language name
  const baseLang = langCode.split('-')[0]
  const basicNames: { [key: string]: string } = {
    'en': 'English', 'pt': 'Portuguese', 'es': 'Spanish', 'fr': 'French',
    'de': 'German', 'it': 'Italian', 'ja': 'Japanese', 'zh': 'Chinese',
    'ko': 'Korean', 'ru': 'Russian', 'nl': 'Dutch', 'sv': 'Swedish',
    'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish', 'pl': 'Polish',
    'cs': 'Czech', 'tr': 'Turkish', 'ar': 'Arabic', 'he': 'Hebrew',
    'el': 'Greek', 'th': 'Thai', 'id': 'Indonesian', 'vi': 'Vietnamese',
    'ro': 'Romanian', 'hu': 'Hungarian', 'sk': 'Slovak'
  }
  
  return basicNames[baseLang] || langCode
}
