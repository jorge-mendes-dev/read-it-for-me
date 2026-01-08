/**
 * Get country code from language code
 * @param langCode - Language code (e.g., 'en-US', 'pt_BR', 'fr')
 * @returns Country code (e.g., 'US', 'BR', 'FR')
 */
export function getCountryCode(langCode: string): string {
  if (!langCode) return ''
  
  // Normalize the language code (handle both - and _ separators)
  const normalized = langCode.replace('_', '-')
  const parts = normalized.split('-')
  const countryCode = parts.length > 1 ? parts[1] : parts[0]
  
  return countryCode.toUpperCase()
}

/**
 * Get flag emoji from language code
 * @param langCode - Language code (e.g., 'en-US', 'pt_BR', 'fr')
 * @returns Flag emoji string
 */
export function getFlagEmoji(langCode: string): string {
  if (!langCode) return '🌐'
  
  const countryCode = getCountryCode(langCode)
  
  const flagMap: { [key: string]: string } = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'AU': '🇦🇺', 'CA': '🇨🇦', 'IN': '🇮🇳', 'IE': '🇮🇪', 'ZA': '🇿🇦',
    'BR': '🇧🇷', 'PT': '🇵🇹',
    'ES': '🇪🇸', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CO': '🇨🇴', 'CL': '🇨🇱',
    'FR': '🇫🇷', 'BE': '🇧🇪', 'CH': '🇨🇭',
    'DE': '🇩🇪', 'AT': '🇦🇹',
    'IT': '🇮🇹',
    'JP': '🇯🇵',
    'CN': '🇨🇳', 'TW': '🇹🇼', 'HK': '🇭🇰', 'SG': '🇸🇬',
    'KR': '🇰🇷',
    'RU': '🇷🇺',
    'NL': '🇳🇱',
    'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
    'PL': '🇵🇱', 'CZ': '🇨🇿',
    'TR': '🇹🇷',
    'SA': '🇸🇦', 'AE': '🇦🇪',
    'IL': '🇮🇱',
    'GR': '🇬🇷',
    'TH': '🇹🇭',
    'ID': '🇮🇩',
    'VN': '🇻🇳',
    'PH': '🇵🇭',
    'RO': '🇷🇴', 'HU': '🇭🇺', 'SK': '🇸🇰',
    // Language-only codes - default flags (uppercase for consistency)
    'EN': '🇺🇸', 'JA': '🇯🇵', 'ZH': '🇨🇳',
    'KO': '🇰🇷', 'SV': '🇸🇪',
    'DA': '🇩🇰', 'CS': '🇨🇿', 'HE': '🇮🇱',
    'EL': '🇬🇷', 'VI': '🇻🇳'
  }
  
  return flagMap[countryCode] || '🌐'
}
