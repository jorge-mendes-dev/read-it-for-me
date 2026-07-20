/**
 * Calculate quality score for a voice based on name indicators
 * Higher scores indicate better quality (neural, premium, enhanced voices)
 *
 * Chrome-specific notes:
 * - Google network voices (e.g., "Google US English") are marked as !localService
 *   and are generally high quality but don't have "neural" in their name
 * - Microsoft voices on Windows (e.g., "Microsoft David") are local and decent quality
 * - Chrome may also expose system voices with generic names
 *
 * @param voice - SpeechSynthesisVoice object
 * @returns Quality score (0-200+)
 */
export function getVoiceScore(voice: SpeechSynthesisVoice): number {
  let score = 0
  const name = voice.name.toLowerCase()

  // Premium quality indicators (highest priority)
  if (name.includes('neural')) score += 100
  if (name.includes('premium')) score += 90
  if (name.includes('enhanced')) score += 80
  if (name.includes('natural')) score += 70

  // Platform quality indicators
  if (name.includes('microsoft')) score += 40
  if (name.includes('google')) score += 45 // Google voices in Chrome are high quality
  if (name.includes('amazon')) score += 35
  if (name.includes('apple')) score += 35

  // Online/cloud voices (usually higher quality than local)
  // In Chrome, !localService means it's a network/cloud voice
  if (!voice.localService) score += 50
  if (name.includes('online')) score += 30
  if (name.includes('cloud')) score += 25

  // HD quality indicator
  if (name.includes('hd') || name.includes('high')) score += 20

  // Penalize obviously low-quality voices
  if (name.includes('espeak') || name.includes('mbrola')) score -= 30

  return Math.max(0, score)
}

/**
 * Check if voice is premium quality (score >= 70)
 * @param voice - SpeechSynthesisVoice object
 * @returns True if voice is premium quality
 */
export function isPremiumVoice(voice: SpeechSynthesisVoice): boolean {
  return getVoiceScore(voice) >= 70
}

/**
 * Sort voices by quality score (descending)
 * @param voices - Array of voices with scores
 * @returns Sorted array
 */
export function sortVoicesByQuality<T extends { score: number }>(voices: T[]): T[] {
  return [...voices].sort((a, b) => b.score - a.score)
}

/**
 * Get a human-readable quality label for a voice
 * @param voice - SpeechSynthesisVoice object
 * @returns Quality label string
 */
export function getVoiceQualityLabel(voice: SpeechSynthesisVoice): string {
  const score = getVoiceScore(voice)
  const name = voice.name.toLowerCase()

  if (name.includes('neural')) return 'Neural'
  if (name.includes('premium')) return 'Premium'
  if (name.includes('enhanced')) return 'Enhanced'
  if (name.includes('natural')) return 'Natural'
  if (!voice.localService) return 'Online'
  if (score >= 40) return 'Good'
  return 'Basic'
}

/**
 * Get searchable tags for a voice (used for improved search/filter)
 * @param voice - SpeechSynthesisVoice object
 * @returns Array of searchable tag strings
 */
export function getVoiceSearchTags(voice: SpeechSynthesisVoice): string[] {
  const tags: string[] = []
  const name = voice.name.toLowerCase()

  // Quality tags
  if (name.includes('neural')) tags.push('neural', 'premium', 'high quality')
  if (name.includes('premium')) tags.push('premium', 'high quality')
  if (name.includes('enhanced')) tags.push('enhanced', 'high quality')
  if (name.includes('natural')) tags.push('natural', 'high quality')
  if (!voice.localService) tags.push('online', 'cloud', 'network')
  if (voice.localService) tags.push('offline', 'local')

  // Platform tags
  if (name.includes('google')) tags.push('google', 'chrome')
  if (name.includes('microsoft')) tags.push('microsoft', 'windows')
  if (name.includes('apple') || name.includes('samantha')) tags.push('apple', 'mac')

  // Voice characteristics from name
  if (name.includes('female') || name.includes('woman')) tags.push('female', 'woman')
  if (name.includes('male') && !name.includes('female')) tags.push('male', 'man')

  return tags
}
