# GitHub Copilot Instructions - Read It For Me Extension

## Project Overview
A browser extension (Chrome/Edge/Firefox) that provides natural text-to-speech functionality with smart language detection, premium voice selection, and accessibility features.

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 with custom design system
- **APIs**: Chrome Extension Manifest V3, Web Speech API
- **i18n**: Custom localization system with 7 languages

## Project Structure
```
src/
├── popup/          # React UI for extension popup
│   ├── App.tsx     # Main popup component (685 lines)
│   ├── main.tsx    # React entry point
│   └── components/ # Reusable UI components
├── content/        # Content scripts injected into pages
│   ├── content.ts  # Main content script with TTS logic
│   └── floatingPlayer.ts # Floating player UI
├── background/     # Background service worker
├── utils/          # Shared utilities
│   └── i18n.ts     # Internationalization system
└── types/          # TypeScript type definitions
public/
├── _locales/       # i18n message files (en, pt_BR, es, fr, de, ja, zh_CN)
└── manifest.json   # Chrome extension manifest
```

## Architecture Patterns

### Extension Architecture
- **Popup**: React-based settings UI with persistent storage
- **Content Script**: Vanilla TypeScript for page interaction and TTS
- **Background**: Service worker for cross-context messaging
- **Floating Player**: Injected UI for playback controls

### State Management
- Chrome Storage API (`chrome.storage.local`) for persistence
- React hooks (`useState`, `useEffect`) for UI state
- Event-driven communication between contexts
- Custom events (`window.dispatchEvent`) for same-page messaging

### Communication Flow
```
Popup UI ↔ Background Script ↔ Content Script
                               ↕
                          Floating Player
```

## Coding Conventions

### TypeScript
- **Strict mode enabled** - no implicit any
- Use explicit types for function parameters and return values
- Interface for complex objects, type for unions/primitives
- Prefer `const` over `let`, avoid `var`

### React Components
- **Functional components only** with hooks
- Props destructuring in component signature
- Early returns for conditional rendering
- Keep components under 300 lines (extract if larger)

### Naming Conventions
- **Components**: PascalCase (`App.tsx`, `VoiceSelector.tsx`)
- **Functions**: camelCase (`handleSelectionRead`, `saveAsDefault`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Files**: camelCase for utils, PascalCase for components
- **CSS Classes**: Tailwind utility classes only

### Event Handlers
```typescript
// ✅ Good
const handleVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
  setSelectedVoice(Number(e.target.value))
}

// ❌ Avoid inline arrow functions in JSX for complex logic
<select onChange={(e) => { /* complex logic */ }} />
```

## Tailwind CSS & Design System

### Custom Design Tokens (tailwind.config.js)
```javascript
colors: {
  primary: '#6366f1',          // Main brand color (indigo)
  secondary: '#8b5cf6',        // Secondary accent (purple)
  success: '#10b981',          // Success states
  warning: '#f59e0b',          // Warning states
  error: '#ef4444',            // Error states
}
```

### Dark Mode
- Use `darkMode: 'class'` strategy
- Always provide dark mode variants: `dark:bg-gray-800`
- Theme states: `'light' | 'dark' | 'auto'`
- Respect system preferences for 'auto' mode

### Spacing Scale
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px, 3xl: 48px
- Use semantic spacing: `space-y-4`, `gap-2`, `p-5`

### Component Patterns
```tsx
// Button with hover effects
className="py-2.5 px-4 bg-gradient-to-r from-primary to-secondary 
           text-white rounded-xl font-semibold transition-all duration-200 
           hover:shadow-lg hover:scale-105 active:scale-95"

// Card container
className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm 
           rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50"

// Input/Select
className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 
           rounded-xl focus:ring-2 focus:ring-primary focus:border-primary 
           transition-all bg-white dark:bg-gray-700 dark:text-white"
```

### Animation Classes
- `animate-fade-in` (300ms opacity)
- `animate-slide-up`, `animate-slide-down` (300ms translate)
- `animate-scale-in` (200ms scale)
- `animate-pulse-slow` (3s pulse)

## Internationalization (i18n)

### Usage Pattern
```typescript
import { t, setLocale, initializeLocale } from '../utils/i18n'

// In components
<button>{t('saveAsDefault')}</button>
<p>{t('welcomeDescription')}</p>

// Change language
await setLocale('pt_BR')
```

### Adding New Translations
1. Add key to all 7 locale files in `public/_locales/*/messages.json`
2. Use descriptive keys: `tipKeyboardShortcut`, `autoDetectLanguageDesc`
3. Include description field for context
4. Format: `{ "key": { "message": "Text", "description": "Context" } }`

### Supported Locales
- `en` - English (default)
- `pt_BR` - Portuguese (Brazil)
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `zh_CN` - Chinese (Simplified)

## Chrome Extension APIs

### Storage
```typescript
// Save
chrome.storage.local.set({ key: value })

// Load
chrome.storage.local.get(['key1', 'key2'], (result) => {
  const value = result.key1 ?? defaultValue
})
```

### Messaging
```typescript
// Send from content script
chrome.runtime.sendMessage({ action: 'startReading', text })

// Listen in background/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    sendResponse({ text: selectedText })
    return true // Keep channel open for async
  }
})
```

### File URLs
```typescript
// Get extension resource URLs
const url = chrome.runtime.getURL('icons/icon128.png')
const localeUrl = chrome.runtime.getURL('_locales/en/messages.json')
```

## Web Speech API Patterns

### Voice Selection
```typescript
// Load voices (may be async)
const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices())
      }
    }
  })
}
```

### Speech Synthesis
```typescript
const utterance = new SpeechSynthesisUtterance(text)
utterance.voice = voices[selectedVoice]
utterance.rate = 0.9   // 0.1 to 10
utterance.pitch = 1    // 0 to 2
utterance.volume = 1   // 0 to 1

utterance.onend = () => { /* cleanup */ }
utterance.onerror = (e) => { /* handle error */ }
utterance.onboundary = (e) => { /* word tracking */ }

window.speechSynthesis.speak(utterance)
```

### Playback Control
```typescript
window.speechSynthesis.pause()    // Pause
window.speechSynthesis.resume()   // Resume
window.speechSynthesis.cancel()   // Stop and clear
```

## Keyboard Shortcuts

### Current Shortcuts (content script)
- `Ctrl+Shift+R` - Read selected text
- `Space` - Pause/resume (when reading, not in input fields)
- `Escape` - Stop reading

### Implementation Pattern
```typescript
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Check for input/editable elements
  const target = e.target as HTMLElement
  const isEditable = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable

  if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
    e.preventDefault()
    // Handle shortcut
  }
})
```

## Browser Compatibility

### Manifest Differences
- **Chrome/Edge**: Manifest V3 with `minimum_chrome_version: "109"`
- **Firefox**: Manifest V2 with `strict_min_version: "79.0"`
- Firefox requires `browser_specific_settings.gecko.data_collection_permissions`

### Voice Availability
- **Edge**: 20-50+ voices (includes Microsoft Neural voices)
- **Firefox**: 3-10 voices (limited by browser sandbox)
- **Chrome**: Similar to Edge on Windows

### SVG Manipulation
```typescript
// ✅ Safe for Firefox
const path = icon.querySelector('path')
path?.setAttribute('d', newPathData)

// ❌ Avoid (CSP issues)
icon.innerHTML = '<path d="..."/>'
```

## Accessibility Guidelines

### ARIA Attributes
```tsx
<button 
  aria-label="Close welcome guide"
  aria-expanded={isExpanded}
  aria-controls="section-id"
/>

<div role="dialog" aria-modal="true" aria-labelledby="title-id">
  <h2 id="title-id">Title</h2>
</div>

<div role="status" aria-label="Loading voices">
  {/* Loading content */}
</div>
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, not `<div onClick>`)
- Visible focus indicators (Tailwind: `focus:ring-2 focus:ring-primary`)
- Logical tab order

### Screen Readers
- Provide alt text for images
- Use semantic headings (h1, h2, h3)
- Live regions for dynamic content
- Descriptive button labels

## Performance Considerations

### Code Splitting
- Popup bundle: ~167KB (gzipped: 53KB)
- Content script: ~35KB (gzipped: 8KB)
- Minimize dependencies in content script

### Storage Efficiency
```typescript
// ✅ Store only necessary data
chrome.storage.local.set({ 
  defaultVoiceIndex: 0,
  recentVoices: [0, 5, 12] // indices only
})

// ❌ Avoid storing large objects
chrome.storage.local.set({ allVoiceData: voices }) // Too large
```

### Event Listeners
- Remove listeners when not needed
- Avoid duplicate listeners
- Use event delegation where possible

## Common Patterns in Codebase

### Voice Scoring Algorithm
```typescript
const getVoiceScore = (voice: SpeechSynthesisVoice): number => {
  let score = 0
  const name = voice.name.toLowerCase()
  if (name.includes('neural')) score += 100
  if (name.includes('premium')) score += 90
  if (name.includes('enhanced')) score += 80
  if (name.includes('microsoft')) score += 40
  return score
}
```

### Language Detection
```typescript
const detectLanguageFromText = (text: string): string => {
  // Check for language-specific patterns
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh-CN'
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'
  if (/[\u0600-\u06ff]/.test(text)) return 'ar'
  // ... more patterns
  return 'en'
}
```

### Theme Toggle Pattern
```typescript
const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

useEffect(() => {
  const root = document.documentElement
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}, [theme])
```

## Testing Workflow

### Build Commands
```bash
npm run dev          # Development build with watch
npm run build        # Production build
npm run build:firefox # Firefox-specific build
```

### Manual Testing Checklist
- [ ] Dark mode toggle works in both themes
- [ ] Keyboard shortcuts don't interfere with input fields
- [ ] Voice selection persists after reload
- [ ] i18n changes reflect in all locales
- [ ] Extension works in both Chrome and Firefox
- [ ] No console errors in content script

## Error Handling

### Content Script Errors
```typescript
utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
  console.error('Speech synthesis error:', event.error)
  // Clean up state
  isReading = false
  hidePlayer()
  updateState()
}
```

### Storage Errors
```typescript
chrome.storage.local.get(['key'], (result) => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError)
    // Use default values
  }
  const value = result.key ?? defaultValue
})
```

## Security Best Practices

### Content Security Policy
- Avoid `eval()` and `new Function()`
- No inline scripts in HTML
- Use `setAttribute()` instead of `innerHTML` for untrusted content
- Sanitize user input before display

### Permissions
- Request minimal permissions in manifest
- Explain permission usage in store listing
- Use `activeTab` instead of `tabs` when possible

## Git Workflow

### Ignored Files
- `dist/` - Build output
- `dist-firefox/` - Firefox build output
- `node_modules/`
- `.DS_Store`, `Thumbs.db`

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

## Code Review Checklist

When suggesting or reviewing code:
- [ ] TypeScript types are explicit
- [ ] Dark mode variants included for all colors
- [ ] i18n used for all user-facing text
- [ ] ARIA attributes added for accessibility
- [ ] Chrome storage used for persistence
- [ ] Event listeners cleaned up properly
- [ ] Error handling implemented
- [ ] No hardcoded indigo colors (use semantic tokens)
- [ ] Input validation for user data
- [ ] Browser compatibility considered

## Specific Component Guidelines

### Popup App.tsx
- Keep under 700 lines (consider extraction at 800+)
- Use collapsible sections for settings organization
- Always include loading states for async operations
- Persist user preferences to chrome.storage immediately

### Content Script
- Minimize DOM manipulation
- Use event delegation
- Clean up on window unload
- Avoid memory leaks in long-running pages

### Floating Player
- Use fixed positioning
- High z-index (999999)
- Don't interfere with page content
- Provide dragging functionality

## When to Extract Components

Extract when:
- Logic exceeds 50 lines
- Component is reused 2+ times
- Clear single responsibility
- Complex state management

Example candidates:
- VoiceSelector component (currently inline)
- ThemeToggle component
- SettingsSection component (collapsible pattern)
- LoadingSkeleton component

## Future Enhancements to Consider

When implementing new features, align with:
- Material Design 3 principles
- WCAG 2.1 AA accessibility standards
- Progressive enhancement approach
- Mobile-first responsive design
- Offline-first capabilities

## Additional Resources

- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Tailwind CSS: https://tailwindcss.com/docs
- React TypeScript Cheatsheet: https://react-typescript-cheatsheet.netlify.app/
