import { useCallback, useMemo, useState } from 'react'
import Select, {
  components,
  GroupBase,
  MenuListProps,
  OptionProps,
  SingleValueProps,
  StylesConfig,
} from 'react-select'
import { VOICE_QUALITY } from '../../constants'
import type { VoicesByLanguage, VoiceWithScore } from '../../types'
import { getFlagEmoji } from '../../utils/flags'
import { t } from '../../utils/i18n'
import { getLanguageName } from '../../utils/languages'
import { getVoiceQualityLabel, getVoiceScore, getVoiceSearchTags } from '../../utils/voiceScoring'

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[]
  selectedVoice: number
  recentVoices: number[]
  isLoading: boolean
  onVoiceChange: (voiceIndex: number) => void
  onTest: () => void
  hasNetworkVoices?: boolean
}

interface VoiceOption {
  value: number
  label: string
  voice: SpeechSynthesisVoice
  score: number
  flag: string
  isPremium: boolean
  qualityLabel: string
  searchTags: string[]
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
  hasNetworkVoices,
}: VoiceSelectorProps) {
  const [showChromeHelp, setShowChromeHelp] = useState(false)

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
            qualityLabel: getVoiceQualityLabel(voice),
            searchTags: getVoiceSearchTags(voice),
          }
        })

      if (recentOptions.length > 0) {
        options.push({
          label: `⭐ ${t('recentVoices') || 'Recent'}`,
          options: recentOptions,
        })
      }
    }

    // Add recommended/premium voices group (top-quality voices across all languages)
    const premiumVoices: VoiceOption[] = voices
      .map((voice, index) => {
        const score = getVoiceScore(voice)
        return {
          value: index,
          label: voice.name,
          voice,
          score,
          flag: getFlagEmoji(voice.lang),
          isPremium: score >= VOICE_QUALITY.PREMIUM_THRESHOLD,
          qualityLabel: getVoiceQualityLabel(voice),
          searchTags: getVoiceSearchTags(voice),
        }
      })
      .filter((v) => v.score >= VOICE_QUALITY.PREMIUM_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Top 10 premium voices

    if (premiumVoices.length > 0) {
      options.push({
        label: `⚡ ${t('recommendedVoices') || 'Recommended'}`,
        options: premiumVoices,
      })
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
          qualityLabel: getVoiceQualityLabel(voice),
          searchTags: getVoiceSearchTags(voice),
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

  // Custom option component with quality indicators
  const CustomOption = useCallback((props: OptionProps<VoiceOption, false, VoiceGroupOption>) => {
    const { data } = props
    return (
      <components.Option {...props}>
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">{data.flag}</span>
          <div className="flex-1 min-w-0">
            <span className="block truncate">{data.label}</span>
            <span className="text-[10px] opacity-60">
              {data.qualityLabel}
              {!data.voice.localService && ' • ☁️'}
            </span>
          </div>
          {data.isPremium && (
            <span className="text-primary flex-shrink-0" title="Premium quality voice">
              ⚡
            </span>
          )}
        </div>
      </components.Option>
    )
  }, [])

  // Custom single value component with quality indicator
  const CustomSingleValue = useCallback(
    (props: SingleValueProps<VoiceOption, false, VoiceGroupOption>) => {
      const { data } = props
      return (
        <components.SingleValue {...props}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{data.flag}</span>
            <span className="flex-1 truncate">{data.label}</span>
            <span className="text-[10px] opacity-60 flex-shrink-0">{data.qualityLabel}</span>
            {data.isPremium && <span className="text-primary flex-shrink-0">⚡</span>}
          </div>
        </components.SingleValue>
      )
    },
    []
  )

  // Custom menu list with voice count
  const CustomMenuList = useCallback(
    (props: MenuListProps<VoiceOption, false, VoiceGroupOption>) => {
      return (
        <components.MenuList {...props}>
          <div className="px-3 py-1.5 text-[10px] text-ink-subtle border-b border-hairline bg-surface-2 flex items-center justify-between">
            <span>
              {voices.length} {t('voicesAvailable') || 'voices available'}
            </span>
            <span className="opacity-70">⚡ = {t('premiumQuality') || 'premium'}</span>
          </div>
          {props.children}
        </components.MenuList>
      )
    },
    [voices.length]
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
        padding: '0',
        maxHeight: '340px',
        scrollBehavior: 'smooth',
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
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        margin: '0.125rem 0.5rem',
        fontSize: '0.8125rem',
        transition: 'all 0.15s',
        '&:active': {
          backgroundColor: 'var(--primary)',
        },
      }),
      groupHeading: (base) => ({
        ...base,
        color: 'var(--select-group-text)',
        fontSize: '0.7rem',
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
      <div className="space-y-3" role="status" aria-label="Loading voices">
        <div className="flex items-center justify-between mb-1">
          <div className="h-3 w-20 ui-shimmer rounded"></div>
          <div className="h-6 w-14 ui-shimmer rounded-md"></div>
        </div>
        <div className="h-[48px] ui-shimmer rounded-lg"></div>
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-3 h-3 rounded-full bg-primary/40 animate-pulse"></div>
          <p className="text-center text-xs text-ink-subtle">
            {t('loadingVoices') ||
              'Loading voices... Chrome may take a moment to load network voices.'}
          </p>
        </div>
      </div>
    )
  }

  // Show helpful message if very few voices available
  const showFewVoicesWarning = voices.length > 0 && voices.length < 5

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="voice-select" className="block text-xs font-medium text-ink-muted">
          {t('selectVoice')}
          <span className="ml-1 text-ink-subtle font-normal">({voices.length})</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowChromeHelp(!showChromeHelp)}
            className="text-xs text-ink-subtle hover:text-ink px-2 py-1 rounded-md ui-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Voice help for Chrome"
            title={t('getMoreVoices') || 'Get more voices'}
          >
            💡
          </button>
          <button
            onClick={onTest}
            className="text-xs bg-surface-2 border border-hairline text-ink px-3 py-1.5 rounded-md ui-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 font-medium"
            aria-label="Test selected voice"
          >
            🔊 {t('test')}
          </button>
        </div>
      </div>

      {/* Chrome help panel */}
      {showChromeHelp && (
        <div className="p-3 bg-surface-2 border border-hairline rounded-lg text-xs text-ink-muted space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">
              💡 {t('getMoreVoicesChromeTitle') || 'Get More Voices in Chrome'}
            </span>
            <button
              onClick={() => setShowChromeHelp(false)}
              className="text-ink-subtle hover:text-ink"
              aria-label="Close help"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1.5 list-none pl-0">
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">1️⃣</span>
              <span>
                {t('chromeHelpStep1') ||
                  'Open Windows Settings → Time & Language → Language → Add a language. Each language pack adds new voices.'}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">2️⃣</span>
              <span>
                {t('chromeHelpStep2') ||
                  'Ensure you have an internet connection — Chrome loads additional Google cloud voices when online.'}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">3️⃣</span>
              <span>
                {t('chromeHelpStep3') ||
                  'Try Microsoft Edge for 300+ neural voices (Microsoft Online Natural voices), or install the "Natural Voices" from Windows Settings → Accessibility → Narrator → Add voices.'}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">4️⃣</span>
              <span>
                {t('chromeHelpStep4') ||
                  'On Windows 11: Settings → Accessibility → Narrator → "Add natural voices" to install high-quality voices that Chrome can also use.'}
              </span>
            </li>
          </ul>
          {!hasNetworkVoices && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-2 flex items-center gap-1">
              ⚠️{' '}
              {t('noNetworkVoicesWarning') ||
                'No Google network voices detected. Check your internet connection or try reloading the extension.'}
            </p>
          )}
        </div>
      )}

      {/* Few voices warning */}
      {showFewVoicesWarning && !showChromeHelp && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            {t('fewVoicesWarning') ||
              `Only ${voices.length} voices found. Click 💡 for tips on getting more voices.`}
          </span>
        </div>
      )}

      <Select<VoiceOption, false, VoiceGroupOption>
        inputId="voice-select"
        options={selectOptions}
        value={selectedOption}
        onChange={(option) => option && onVoiceChange(option.value)}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
          MenuList: CustomMenuList,
        }}
        styles={customStyles}
        isSearchable
        filterOption={(option, inputValue) => {
          if (!inputValue) return true
          const query = inputValue.toLowerCase()
          const data = option.data

          // Search in voice name
          if (data.label.toLowerCase().includes(query)) return true

          // Search in language code
          if (data.voice.lang.toLowerCase().includes(query)) return true

          // Search in language name
          if (getLanguageName(data.voice.lang).toLowerCase().includes(query)) return true

          // Search in quality label
          if (data.qualityLabel.toLowerCase().includes(query)) return true

          // Search in tags (premium, neural, online, google, etc.)
          if (data.searchTags.some((tag) => tag.includes(query))) return true

          // Search "online" / "offline" based on localService property
          if (query === 'online' && !data.voice.localService) return true
          if (query === 'offline' && data.voice.localService) return true

          return false
        }}
        placeholder={
          t('searchVoicesByLanguage') || 'Search by name, language, quality (premium, online)...'
        }
        noOptionsMessage={() =>
          t('noVoicesFound') || 'No voices found. Try a different search term.'
        }
        classNamePrefix="voice-select"
        aria-label="Select voice for text-to-speech"
      />

      {/* Voice type legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-ink-subtle pt-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
          {t('premiumVoice') || 'Premium'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70"></span>
          {t('onlineVoice') || 'Online'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/50"></span>
          {t('offlineVoice') || 'Offline'}
        </span>
      </div>
    </div>
  )
}
