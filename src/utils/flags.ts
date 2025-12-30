/**
 * Get flag emoji from language code
 * @param langCode - Language code (e.g., 'en-US', 'pt_BR', 'fr')
 * @returns Flag emoji string
 */
export function getFlagEmoji(langCode: string): string {
  if (!langCode) return '🌐'
  
  // Normalize the language code (handle both - and _ separators)
  const normalized = langCode.replace('_', '-')
  const parts = normalized.split('-')
  const countryCode = parts.length > 1 ? parts[1] : parts[0]
  
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
    // Language-only codes - default flags
    'en': '🇺🇸', 'pt': '🇵🇹', 'es': '🇪🇸', 'fr': '🇫🇷',
    'de': '🇩🇪', 'it': '🇮🇹', 'ja': '🇯🇵', 'zh': '🇨🇳',
    'ko': '🇰🇷', 'ru': '🇷🇺', 'nl': '🇳🇱', 'sv': '🇸🇪',
    'no': '🇳🇴', 'da': '🇩🇰', 'fi': '🇫🇮', 'pl': '🇵🇱',
    'cs': '🇨🇿', 'tr': '🇹🇷', 'ar': '🇸🇦', 'he': '🇮🇱',
    'el': '🇬🇷', 'th': '🇹🇭', 'id': '🇮🇩', 'vi': '🇻🇳',
    'ro': '🇷🇴', 'hu': '🇭🇺', 'sk': '🇸🇰'
  }
  
  return flagMap[countryCode.toUpperCase()] || flagMap[countryCode.toLowerCase()] || '🌐'
}
