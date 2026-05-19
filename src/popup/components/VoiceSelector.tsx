import { useCallback, useMemo } from 'react'
import Select, {
  components,
  GroupBase,
  OptionProps,
  SingleValueProps,
  StylesConfig,
} from 'react-select'
import { VOICE_QUALITY } from '../../constants'
import type { VoicesByLanguage, VoiceWithScore } from '../../types'
import { getFlagEmoji } from '../../utils/flags'
import { t } from '../../utils/i18n'
import { getLanguageName } from '../../utils/languages'
import { getVoiceScore } from '../../utils/voiceScoring'

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[]
  selectedVoice: number
  recentVoices: number[]
  isLoading: boolean
  onVoiceChange: (voiceIndex: number) => void
  onTest: () => void
}

interface VoiceOption {
  value: number
  label: string
  voice: SpeechSynthesisVoice
  score: number
  flag: string
  isPremium: boolean
}

interface VoiceGroupOption extends GroupBase<VoiceOption> {
  label: string
  options: VoiceOption[]
}

export function VoiceSelector({
  voices,
  selectedVoice,
  recentVoices,
  isLoading,
  onVoiceChange,
  onTest,
}: VoiceSelectorProps) {
  // Prepare options for react-select
  const selectOptions = useMemo(() => {
    const options: VoiceGroupOption[] = []

    // Add recent voices group
    if (recentVoices.length > 0) {
      const recentOptions: VoiceOption[] = recentVoices
        .filter((idx) => voices[idx])
        .map((idx) => {
          const voice = voices[idx]
          const score = getVoiceScore(voice)
          return {
            value: idx,
            label: voice.name,
            voice,
            score,
            flag: getFlagEmoji(voice.lang),
            isPremium: score >= VOICE_QUALITY.PREMIUM_THRESHOLD,
          }
        })

      if (recentOptions.length > 0) {
        options.push({
          label: '⭐ Recent',
          options: recentOptions,
        })
      }
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

    // Add language groups
    sortedLangs.forEach((lang) => {
      const flag = getFlagEmoji(lang)
      const langName = getLanguageName(lang)

      // Sort voices within language by score (premium first)
      const sortedVoices = voicesByLang[lang].sort(
        (a: VoiceWithScore, b: VoiceWithScore) => b.score - a.score
      )

      const langOptions: VoiceOption[] = sortedVoices.map(
        ({ voice, index, score }: VoiceWithScore) => ({
          value: index,
          label: voice.name,
          voice,
          score,
          flag,
          isPremium: score >= VOICE_QUALITY.PREMIUM_THRESHOLD,
        })
      )

      options.push({
        label: `${flag} ${langName}`,
        options: langOptions,
      })
    })

    return options
  }, [voices, recentVoices])

  // Find selected option
  const selectedOption = useMemo(() => {
    for (const group of selectOptions) {
      const found = group.options.find((opt) => opt.value === selectedVoice)
      if (found) return found
    }
    return null
  }, [selectOptions, selectedVoice])

  // Custom option component with proper typing
  const CustomOption = useCallback((props: OptionProps<VoiceOption, false, VoiceGroupOption>) => {
    const { data } = props
    return (
      <components.Option {...props}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{data.flag}</span>
          <span className="flex-1">{data.label}</span>
          {data.isPremium && <span className="text-primary">⚡</span>}
        </div>
      </components.Option>
    )
  }, [])

  // Custom single value component with proper typing
  const CustomSingleValue = useCallback(
    (props: SingleValueProps<VoiceOption, false, VoiceGroupOption>) => {
      const { data } = props
      return (
        <components.SingleValue {...props}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{data.flag}</span>
            <span className="flex-1 truncate">{data.label}</span>
            {data.isPremium && <span className="text-primary">⚡</span>}
          </div>
        </components.SingleValue>
      )
    },
    []
  )

  // Custom styles for dark mode and theme matching (memoized)
  const customStyles: StylesConfig<VoiceOption, false, VoiceGroupOption> = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        backgroundColor: 'var(--select-bg)',
        borderColor: state.isFocused ? 'var(--primary)' : 'var(--select-border)',
        borderWidth: '1px',
        borderRadius: '8px',
        boxShadow: state.isFocused ? 'var(--select-focus-ring)' : 'none',
        padding: '0.125rem',
        minHeight: '48px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'var(--primary)',
        },
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: 'var(--select-menu-bg)',
        borderRadius: '8px',
        boxShadow: 'none',
        border: '1px solid var(--select-border)',
        overflow: 'hidden',
      }),
      menuList: (base) => ({
        ...base,
        padding: '0.5rem',
        maxHeight: '300px',
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? 'var(--primary)'
          : state.isFocused
            ? 'var(--select-option-hover)'
            : 'transparent',
        color: state.isSelected ? 'white' : 'var(--select-text)',
        cursor: 'pointer',
        padding: '0.75rem',
        borderRadius: '6px',
        transition: 'all 0.15s',
        '&:active': {
          backgroundColor: 'var(--primary)',
        },
      }),
      groupHeading: (base) => ({
        ...base,
        color: 'var(--select-group-text)',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase' as const,
        padding: '0.5rem 0.75rem',
        marginTop: '0.25rem',
      }),
      singleValue: (base) => ({
        ...base,
        color: 'var(--select-text)',
      }),
      input: (base) => ({
        ...base,
        color: 'var(--select-text)',
      }),
      placeholder: (base) => ({
        ...base,
        color: 'var(--select-placeholder)',
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: 'var(--select-text)',
        padding: '1rem',
      }),
    }),
    []
  )

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" role="status" aria-label="Loading voices">
        <div className="h-12 bg-surface-2 rounded-md"></div>
        <div className="h-12 bg-surface-2 rounded-md"></div>
        <div className="h-12 bg-surface-2 rounded-md"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="voice-select" className="block text-xs font-medium text-ink-muted">
          {t('selectVoice')}
        </label>
        <button
          onClick={onTest}
          className="text-xs bg-surface-2 border border-hairline text-ink px-3 py-1.5 rounded-md transition-all duration-200 hover:bg-surface-3 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 font-medium"
          aria-label="Test selected voice"
        >
          🔊 {t('test')}
        </button>
      </div>

      <Select<VoiceOption, false, VoiceGroupOption>
        inputId="voice-select"
        options={selectOptions}
        value={selectedOption}
        onChange={(option) => option && onVoiceChange(option.value)}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
        }}
        styles={customStyles}
        isSearchable
        filterOption={(option, inputValue) => {
          if (!inputValue) return true
          const query = inputValue.toLowerCase()
          const data = option.data
          return (
            data.label.toLowerCase().includes(query) ||
            data.voice.lang.toLowerCase().includes(query) ||
            getLanguageName(data.voice.lang).toLowerCase().includes(query)
          )
        }}
        placeholder={t('searchVoicesByLanguage') || 'Search by language, country, or voice name...'}
        noOptionsMessage={() => t('noVoicesFound') || 'No voices found'}
        classNamePrefix="voice-select"
        aria-label="Select voice for text-to-speech"
      />
    </div>
  )
}
