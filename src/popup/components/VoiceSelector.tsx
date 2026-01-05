import { t } from '../../utils/i18n'
import { getFlagEmoji } from '../../utils/flags'
import { getLanguageName } from '../../utils/languages'
import { getVoiceScore } from '../../utils/voiceScoring'
import type { VoicesByLanguage, VoiceWithScore } from '../../types'
import { VOICE_QUALITY } from '../../constants'

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[]
  selectedVoice: number
  recentVoices: number[]
  isLoading: boolean
  onVoiceChange: (voiceIndex: number) => void
  onTest: () => void
}

export function VoiceSelector({
  voices,
  selectedVoice,
  recentVoices,
  isLoading,
  onVoiceChange,
  onTest,
}: VoiceSelectorProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" role="status" aria-label="Loading voices">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    )
  }

  // Group voices by language
  const voicesByLang: VoicesByLanguage = {}

  voices.forEach((voice, index) => {
    const lang = voice.lang
    if (!voicesByLang[lang]) {
      voicesByLang[lang] = []
    }
    voicesByLang[lang].push({ voice, index, score: getVoiceScore(voice) })
  })

  // Sort languages alphabetically
  const sortedLangs = Object.keys(voicesByLang).sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="voice-select" className="block text-xs font-medium text-gray-700 dark:text-gray-400">
          {t('selectVoice')}
        </label>
        <button
          onClick={onTest}
          className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-lg transition-all duration-200 hover:bg-indigo-200 dark:hover:bg-indigo-800 hover:scale-105 active:scale-95 font-medium"
          aria-label="Test selected voice"
        >
          🔊 {t('test')}
        </button>
      </div>

      <select
        id="voice-select"
        className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm shadow-sm hover:border-primary/50 cursor-pointer"
        value={selectedVoice}
        onChange={(e) => onVoiceChange(Number(e.target.value))}
        aria-label="Select voice for text-to-speech"
      >
        {recentVoices.length > 0 && (
          <optgroup label="⭐ Recent">
            {recentVoices
              .filter((idx) => voices[idx])
              .map((idx) => {
                const voice = voices[idx]
                const flag = getFlagEmoji(voice.lang)
                return (
                  <option key={`recent-${idx}`} value={idx}>
                    {flag} {voice.name}
                  </option>
                )
              })}
          </optgroup>
        )}

        {sortedLangs.map((lang) => {
          const flag = getFlagEmoji(lang)
          const langName = getLanguageName(lang)

          // Sort voices within language by score (premium first)
          const sortedVoices = voicesByLang[lang].sort(
            (a: VoiceWithScore, b: VoiceWithScore) => b.score - a.score
          )

          return (
            <optgroup key={lang} label={`${flag} ${langName}`}>
              {sortedVoices.map(({ voice, index, score }: VoiceWithScore) => (
                <option key={index} value={index}>
                  {flag} {voice.name}
                  {score >= VOICE_QUALITY.PREMIUM_THRESHOLD ? ' ⚡' : ''}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </div>
  )
}
