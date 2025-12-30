/**
 * Calculate quality score for a voice based on name indicators
 * Higher scores indicate better quality (neural, premium, enhanced voices)
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
  if (name.includes('google')) score += 35
  if (name.includes('amazon')) score += 35
  
  // Online/cloud voices (usually higher quality)
  if (name.includes('online')) score += 30
  if (name.includes('cloud')) score += 25
  
  // HD quality indicator
  if (name.includes('hd') || name.includes('high')) score += 20
  
  return score
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
