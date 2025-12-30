# Read It For Me - Architecture Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Extension Loading Flow](#extension-loading-flow)
3. [User Interaction Flow](#user-interaction-flow)
4. [Component Deep Dive](#component-deep-dive)
5. [Data Flow & Storage](#data-flow--storage)
6. [Internationalization](#internationalization-i18n)
7. [Build System](#build-system)
8. [Cross-Browser Compatibility](#cross-browser-compatibility)
9. [Key Technologies](#key-technologies)
10. [Security & Permissions](#security--permissions)
11. [Performance Optimizations](#performance-optimizations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Popup UI   │    │  Background  │    │   Content    │  │
│  │  (React App) │◄──►│Service Worker│◄──►│   Script     │  │
│  │              │    │              │    │              │  │
│  │ - Settings   │    │ - Messages   │    │ - Selection  │  │
│  │ - Voices     │    │ - State      │    │ - TTS Engine │  │
│  │ - Theme      │    │              │    │ - Player UI  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │         │
│         └────────────────────┴────────────────────┘         │
│                              │                              │
│                    ┌─────────▼─────────┐                    │
│                    │  Chrome Storage   │                    │
│                    │  (Persistent DB)  │                    │
│                    └───────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

- **Popup UI**: User settings, voice selection, theme management
- **Background Service Worker**: Message broker between popup and content scripts
- **Content Script**: Text selection monitoring, TTS engine control, floating player
- **Chrome Storage**: Persistent settings and state

---

## Extension Loading Flow

### On Browser Startup

```
Manifest.json
    │
    ├──► Background Service Worker (background.js)
    │    └─► Loads chunks/browser-polyfill-*.js (webextension API wrapper)
    │    └─► Sets up message listeners
    │
    └──► Content Scripts (injected into ALL web pages)
         └─► content-loader.js (IIFE wrapper)
              └─► Dynamically imports content.js (ES module)
                   └─► Imports chunks/browser-polyfill-*.js
                   └─► Imports floatingPlayer.ts
                   └─► Loads locale messages from _locales/
                   └─► Creates selection tooltip (hidden)
```

### Why the Content Loader Pattern?

**Problem**: Content scripts in Manifest V3 don't support ES module imports directly.

**Solution**: Use a small IIFE wrapper (305 bytes) that dynamically imports the ES module:

```javascript
// content-loader.js
const api = typeof browser !== 'undefined' ? browser : chrome;
await import(api.runtime.getURL('content.js'));
```

**Benefits**:
- Enables modern ES modules in content scripts
- Supports code splitting and tree-shaking
- Cross-browser compatible
- Industry standard pattern

---

## User Interaction Flow

### Scenario: User Selects Text on a Webpage

```
1. User highlights text on example.com
   │
   ▼
2. content.ts detects 'mouseup' event
   │
   ▼
3. window.getSelection() retrieves selected text
   │
   ▼
4. showSelectionTooltip() calculates position
   │
   ▼
5. Tooltip button appears above selection
   └─► SVG speaker icon + "Read This" text (i18n)
```

### Scenario: User Clicks the Read Button

```
1. handleSelectionRead() triggered
   │
   ▼
2. Detect language from:
   - document.documentElement.lang
   - Meta tags
   - Text pattern analysis (Unicode ranges)
   │
   ▼
3. Load voice settings from browser.storage.local
   - defaultVoiceIndex
   - rate, pitch, volume
   │
   ▼
4. Get available voices via speechSynthesis.getVoices()
   │
   ▼
5. Score voices (Neural > Premium > Enhanced > Standard)
   │
   ▼
6. Create SpeechSynthesisUtterance
   - Set text, voice, rate, pitch, volume
   - Attach event handlers (onend, onerror, onboundary)
   │
   ▼
7. showPlayer() - Display floating player UI
   │
   ▼
8. window.speechSynthesis.speak(utterance)
   │
   ▼
9. Browser's TTS engine reads the text
   │
   ▼
10. Progress tracking every 100ms
    - Current word position
    - Time remaining
    - Queue count
```

---

## Component Deep Dive

### A. Content Script (content.ts)

**Responsibilities:**
- Monitor text selection on web pages
- Manage Speech Synthesis (Web Speech API)
- Handle playback queue
- Show/hide floating player
- Process keyboard shortcuts

**Key Functions:**

```javascript
// Text selection monitoring
document.addEventListener('mouseup', handleSelection)
document.addEventListener('selectionchange', debounce(handleSelection))

// Speech synthesis control
startReading(text, voiceIndex, rate, pitch, volume)
pauseReading()
resumeReading()
stopReading()

// Player UI
showPlayer() → Creates floating overlay
updatePlayerState() → Updates play/pause buttons
updateProgress() → Shows reading progress
```

**Event Listeners:**
- `mouseup` - Show tooltip on selection
- `keydown` - Keyboard shortcuts (Ctrl+Shift+R, Space, Escape)
- `chrome.runtime.onMessage` - Messages from popup/background
- `speechSynthesis.onend` - Cleanup when done
- `speechSynthesis.onerror` - Error handling

**Keyboard Shortcuts:**
- `Ctrl+Shift+R` - Read selected text
- `Space` - Pause/resume (when reading, not in input fields)
- `Escape` - Stop reading

---

### B. Floating Player (floatingPlayer.ts)

**Visual Component:**
- Draggable floating window
- Position: bottom-right (or user's last position)
- Z-index: 999999 (always on top)

**UI Elements:**

```
┌────────────────────────────────┐
│  🔊 Read It For Me         ⚙ ✕│  ← Header
├────────────────────────────────┤
│  ▶ ⏸ ⏹                 🗑     │  ← Controls
│  ████████░░░░░░░░░  65%       │  ← Progress bar
│  ⏱ 00:23 / 01:30              │  ← Time
│  📋 Queue: 2 items             │  ← Queue count
└────────────────────────────────┘
```

**Features:**
- Click & drag to move
- Mini mode toggle
- Settings panel (speed, pitch, volume sliders)
- Gradient background with blur effect
- Dark mode auto-detection

**Functions:**

```javascript
showPlayer() - Create and display player
hidePlayer() - Remove player from DOM
updatePlayerState(state) - Update UI based on playback state
updateQueueCount(count) - Show number of items in queue
updateProgress(percent) - Update progress bar
updateTimeEstimate(current, total) - Update time display
```

---

### C. Popup UI (App.tsx - React)

**Purpose:** Extension settings and control panel

**Sections:**

#### 1. Welcome Modal (first-run only)
- Feature tour
- Keyboard shortcuts guide
- Quick start tips

#### 2. Voice Selection
- Grouped by language
- Quality badges (Neural, Premium, Enhanced)
- Play sample button
- Save as default

#### 3. Reading Controls
- Speed: 0.5x - 2.0x (slider)
- Pitch: 0.5 - 2.0 (slider)
- Volume: 0% - 100% (slider)
- Reset to defaults button

#### 4. Settings
- Theme: Light / Dark / Auto
- Language: 7 languages (en, pt_BR, es, fr, de, ja, zh_CN)
- Auto-detect language toggle

**State Management:**

```typescript
// Custom hooks
useTheme() → Manages theme state + localStorage
useVoices() → Loads available voices
useStorage() → Persists settings to chrome.storage.local

// React state
selectedVoice, rate, pitch, volume
theme, locale, hasSeenWelcome
```

**Components Structure:**

```
src/
├── App.tsx (main component)
└── popup/
    └── components/
        ├── WelcomeModal.tsx (80 lines)
        ├── VoiceSelector.tsx (108 lines)
        ├── ThemeToggle.tsx (73 lines)
        └── SettingsSection.tsx (53 lines)
```

---

### D. Background Service Worker (background.ts)

**Purpose:** Message broker between popup and content scripts

**Why needed?**
- Popup can't directly message content scripts in other tabs
- Background worker has access to all tabs

**Message Flow:**

```
Popup → Background → Content Script
   sendMessage()  ↓  tabs.sendMessage()
                  ↓
           Find active tab
                  ↓
           Forward message
```

**Messages Handled:**

```javascript
'startReading'   → Forward to content script
'pauseReading'   → Forward to content script
'resumeReading'  → Forward to content script
'stopReading'    → Forward to content script
'stateUpdate'    → Store reading state
'getState'       → Return current state
```

**Implementation:**

```typescript
browser.runtime.onMessage.addListener((request, sender) => {
  const message = request as Message
  
  switch (message.action) {
    case 'startReading':
    case 'pauseReading':
    case 'resumeReading':
    case 'stopReading':
      return browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
          if (tabs[0]?.id) {
            return browser.tabs.sendMessage(tabs[0].id, request)
          }
          return null
        })
    
    case 'stateUpdate':
      // Store state
      return Promise.resolve({ success: true })
    
    case 'getState':
      return Promise.resolve(currentState)
    
    default:
      return Promise.resolve(null)
  }
})
```

---

## Data Flow & Storage

### Chrome Storage Schema

```javascript
{
  // Voice settings
  defaultVoiceIndex: 0,           // Selected voice
  recentVoices: [0, 5, 12],       // Recently used voices
  
  // Playback settings
  rate: 1.0,                      // 0.5 - 2.0
  pitch: 1.0,                     // 0.5 - 2.0
  volume: 1.0,                    // 0 - 1
  
  // UI settings
  theme: 'auto',                  // 'light' | 'dark' | 'auto'
  selectedLocale: 'en',           // Current language
  hasSeenWelcome: true,           // Hide welcome modal
  
  // Player state
  playerPosition: {x: 20, y: 20}, // Floating player position
  miniMode: false                 // Player size mode
}
```

### Storage Listeners

All components listen for changes:

```javascript
browser.storage.local.onChanged.addListener((changes) => {
  if (changes.rate) {
    updateRate(changes.rate.newValue)
  }
  if (changes.theme) {
    applyTheme(changes.theme.newValue)
  }
  // etc...
})
```

### Storage Access Pattern

```typescript
// Load settings
const result = await browser.storage.local.get(['rate', 'pitch', 'volume'])
  .catch(error => {
    console.error('Storage error:', error)
    return { rate: 1.0, pitch: 1.0, volume: 1.0 }
  })

// Save settings
await browser.storage.local.set({ rate: 1.5 })
  .catch(error => {
    console.error('Failed to save settings:', error)
  })
```

---

## Internationalization (i18n)

### File Structure

```
_locales/
  ├─ en/messages.json        ← English (default)
  ├─ pt_BR/messages.json     ← Portuguese
  ├─ es/messages.json        ← Spanish
  ├─ fr/messages.json        ← French
  ├─ de/messages.json        ← German
  ├─ ja/messages.json        ← Japanese
  └─ zh_CN/messages.json     ← Chinese
```

### Message Format

```json
{
  "readThis": {
    "message": "Read This",
    "description": "Text for the selection tooltip button"
  },
  "saveAsDefault": {
    "message": "Save as Default",
    "description": "Button to save current voice as default"
  }
}
```

### Usage

```javascript
// In content script
import { t } from './utils/i18n'
const text = t('readThis')  // → "Read This"

// In popup (React)
<button>{t('saveAsDefault')}</button>

// Locale loading
await loadLocaleMessages()  // Fetches from _locales/{locale}/messages.json
```

### Language Detection

```javascript
detectLanguageFromText(text):
  - Checks Unicode ranges:
    • Chinese: \u4e00-\u9fa5
    • Japanese: \u3040-\u309f, \u30a0-\u30ff
    • Arabic: \u0600-\u06ff
    • Cyrillic: \u0400-\u04ff
    • Korean: \uac00-\ud7af
  - Fallback: 'en'
```

---

## Build System

### Vite Configuration

```javascript
vite.config.ts
  │
  ├─► Input files:
  │   - popup.html (React app entry)
  │   - src/content/content.ts
  │   - src/background/background.ts
  │
  ├─► Output strategy:
  │   - popup.js (167KB) - React bundle
  │   - content.js (35KB) - ES module
  │   - background.js (631B) - ES module
  │   - chunks/browser-polyfill-*.js (9.8KB) - Shared
  │
  └─► Build hooks:
      - Copy manifest.json → dist/
      - Copy content-loader.js → dist/
      - Copy icons → dist/icons/
      - Copy _locales → dist/_locales/
```

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build for Chrome/Edge
npm run build

# Production build for Firefox
npm run build:firefox
```

### Dual Build Process

**Chrome/Edge Build:**

```bash
npm run build
  ↓
vite build
  ↓
dist/
  ├─ manifest.json (Manifest V3)
  ├─ content-loader.js
  ├─ content.js
  ├─ background.js
  ├─ popup.js
  └─ chunks/browser-polyfill-*.js
```

**Firefox Build:**

```bash
npm run build:firefox
  ↓
scripts/build-firefox.js
  ↓
1. Run vite build
2. Copy dist → dist-firefox
3. Replace manifest.json with manifest-firefox.json
4. Restore original manifest in dist/

dist-firefox/
  └─ manifest.json (Manifest V2)
```

### Manifest Differences

**Chrome/Edge (Manifest V3):**
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Firefox (Manifest V2):**
```json
{
  "manifest_version": 2,
  "background": {
    "scripts": ["background.js"]
  },
  "browser_action": {
    "default_popup": "popup.html"
  },
  "permissions": ["<all_urls>"]
}
```

---

## Cross-Browser Compatibility

### API Abstraction Layer

```javascript
// src/utils/browser.ts
import browser from 'webextension-polyfill'
export default browser

// Then everywhere:
import browser from '../utils/browser'
await browser.storage.local.get(['key'])
await browser.runtime.sendMessage({...})
```

### Polyfill Magic

**Before (Chrome-only callbacks):**
```javascript
chrome.storage.local.get(['key'], (result) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError)
    return
  }
  // use result
})
```

**After (Promise-based, cross-browser):**
```javascript
const result = await browser.storage.local.get(['key'])
  .catch(error => {
    console.error('Storage error:', error)
    return defaultValue
  })
```

### Content Loader Cross-Browser

```javascript
// content-loader.js detects environment:
const api = typeof browser !== 'undefined' ? browser : chrome;
await import(api.runtime.getURL('content.js'));
```

### Benefits

✅ **Single Codebase** - No Chrome vs Firefox code duplication
✅ **Promise-based** - Modern async/await instead of callbacks
✅ **Error Handling** - Consistent error handling across browsers
✅ **TypeScript Support** - Full typing from `@types/webextension-polyfill`

---

## Key Technologies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React** | 18.3.1 | Popup UI | Component reusability, state management |
| **TypeScript** | 5.5.3 | Type safety | Catch errors at compile time |
| **Tailwind CSS** | 3.4.4 | Styling | Rapid UI development, consistent design |
| **Vite** | 5.4.21 | Build tool | Fast builds, ES modules, HMR |
| **webextension-polyfill** | 0.12.0 | Browser API | Promise-based, cross-browser |
| **Web Speech API** | Native | TTS engine | Native browser TTS (no API keys!) |
| **Chrome Storage API** | Native | Persistence | Settings survive browser restart |
| **ESLint** | 9.39.2 | Code quality | Enforce best practices |
| **Prettier** | 3.7.4 | Code formatting | Consistent code style |

### Dev Dependencies

```json
{
  "@vitejs/plugin-react": "^4.3.4",
  "@types/react": "^18.3.3",
  "@types/webextension-polyfill": "^0.12.4",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49",
  "tailwindcss": "^3.4.17",
  "typescript": "^5.5.3",
  "vite": "^5.4.21"
}
```

---

## Security & Permissions

### Minimal Permissions

```json
{
  "permissions": [
    "activeTab",    // Only read content of active tab when clicked
    "storage"       // Save user settings
  ]
}
```

**We DO NOT request:**
- ❌ Reading all tabs
- ❌ Browsing history
- ❌ Cookies
- ❌ Network requests
- ❌ Downloads
- ❌ Bookmarks

### Content Security Policy

- ✅ No `eval()` or `new Function()`
- ✅ No inline scripts
- ✅ Resources loaded from extension only
- ✅ User content sanitized before display
- ✅ HTTPS-only external resources

### Privacy

- **No data collection** - Everything stays local
- **No analytics** - No tracking or telemetry
- **No external APIs** - Uses browser's built-in TTS
- **No cloud storage** - Settings stored in browser only

---

## Performance Optimizations

### 1. Lazy Loading

- Content script only loads when page is idle (`run_at: "document_idle"`)
- Popup only loads when user clicks icon
- Voices loaded asynchronously via `speechSynthesis.getVoices()`

### 2. Code Splitting

```
dist/
  ├─ popup.js (167KB)              ← React UI
  ├─ content.js (35KB)             ← Content script
  ├─ background.js (631B)          ← Message handler
  └─ chunks/
      └─ browser-polyfill-*.js (9.8KB) ← Shared dependency
```

**Benefits:**
- Shared dependencies loaded once
- Smaller individual bundles
- Faster page loads

### 3. Debouncing

```javascript
// Selection events debounced 300ms
const debouncedHandler = debounce(handleSelection, 300)
document.addEventListener('selectionchange', debouncedHandler)
```

**Prevents:**
- Excessive tooltip updates
- CPU thrashing during drag selection
- Memory leaks from rapid event firing

### 4. Memory Management

```javascript
// Cleanup on window unload
window.addEventListener('beforeunload', () => {
  window.speechSynthesis.cancel()
  hidePlayer()
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
```

### 5. Build Optimization

**Production Build:**
- Minification: 167KB → 54KB (gzipped)
- Tree-shaking: Removes unused code
- Dead code elimination
- CSS purging (Tailwind)

**Build Times:**
- Development: ~200ms (HMR)
- Production: ~2.5s (full build)

### 6. Voice Caching

```javascript
// Cache voices after first load
let cachedVoices: SpeechSynthesisVoice[] = []

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (cachedVoices.length > 0) {
      resolve(cachedVoices)
      return
    }
    
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
      resolve(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        cachedVoices = window.speechSynthesis.getVoices()
        resolve(cachedVoices)
      }
    }
  })
}
```

---

## Complete User Journey

```
1. User installs extension from Chrome Web Store / Firefox Add-ons
   │
   ▼
2. Manifest loads background worker + registers content scripts
   │
   ▼
3. User visits example.com
   │
   ▼
4. Content script injected via content-loader.js
   │
   ▼
5. Locale messages loaded from _locales/en/messages.json
   │
   ▼
6. Selection tooltip created (hidden)
   │
   ▼
7. User selects "Hello World"
   │
   ▼
8. Tooltip appears above selection with "Read This" button
   │
   ▼
9. User clicks 🔊 button
   │
   ▼
10. Language detected (English from document.lang)
    │
    ▼
11. Voice settings loaded from chrome.storage.local
    │
    ▼
12. Available voices retrieved via speechSynthesis.getVoices()
    │
    ▼
13. Best English voice selected (Neural > Premium > Standard)
    │
    ▼
14. SpeechSynthesisUtterance created with:
    - text: "Hello World"
    - voice: Microsoft David - English (United States)
    - rate: 1.0
    - pitch: 1.0
    - volume: 1.0
    │
    ▼
15. Floating player appears at bottom-right
    │
    ▼
16. Browser TTS engine speaks "Hello World"
    │
    ▼
17. Progress bar updates every 100ms:
    - Words spoken: 2 / 2
    - Time: 00:01 / 00:02
    - Progress: 100%
    │
    ▼
18. Speech completes (onend event)
    │
    ▼
19. Player fades out after 3 seconds
    │
    ▼
20. User clicks extension icon to adjust settings
    │
    ▼
21. Popup opens with React UI
    │
    ▼
22. User changes speed to 1.5x
    │
    ▼
23. Settings saved to chrome.storage.local
    │
    ▼
24. Content script receives storage.onChanged event
    │
    ▼
25. Next reading uses new speed setting
```

---

## File Structure

```
text-reader-extension/
├── public/
│   ├── manifest.json              ← Chrome/Edge manifest (V3)
│   ├── manifest-firefox.json      ← Firefox manifest (V2)
│   ├── content-loader.js          ← IIFE wrapper for content script
│   ├── icons/                     ← Extension icons
│   └── _locales/                  ← Translation files (7 languages)
│
├── src/
│   ├── main.tsx                   ← React entry point
│   ├── App.tsx                    ← Main popup component
│   ├── index.css                  ← Global styles
│   │
│   ├── background/
│   │   └── background.ts          ← Service worker
│   │
│   ├── content/
│   │   ├── content.ts             ← Main content script
│   │   └── floatingPlayer.ts      ← Floating player UI
│   │
│   ├── popup/
│   │   ├── components/            ← React components
│   │   │   ├── WelcomeModal.tsx
│   │   │   ├── VoiceSelector.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── SettingsSection.tsx
│   │   └── hooks/                 ← Custom React hooks
│   │       ├── useTheme.ts
│   │       ├── useVoices.ts
│   │       └── useStorage.ts
│   │
│   ├── utils/
│   │   ├── browser.ts             ← Browser API wrapper
│   │   └── i18n.ts                ← Internationalization
│   │
│   ├── constants/
│   │   └── index.ts               ← App constants
│   │
│   └── types/
│       └── index.d.ts             ← TypeScript types
│
├── scripts/
│   └── build-firefox.js           ← Firefox build script
│
├── dist/                          ← Chrome/Edge build output
├── dist-firefox/                  ← Firefox build output
│
├── vite.config.ts                 ← Vite configuration
├── tailwind.config.js             ← Tailwind CSS config
├── tsconfig.json                  ← TypeScript config
├── .eslintrc.json                 ← ESLint config
├── .prettierrc                    ← Prettier config
├── package.json                   ← Dependencies
└── README.md                      ← User documentation
```

---

## Build Output Analysis

### Chrome/Edge (dist/)

```
dist/
├── manifest.json (1.1KB)          ← Manifest V3
├── content-loader.js (305B)       ← IIFE wrapper
├── content.js (35KB → 8.5KB gz)   ← Content script
├── background.js (631B → 370B gz) ← Service worker
├── popup.html (437B)              ← Popup entry
├── popup.css (21KB → 4.4KB gz)    ← Tailwind styles
├── popup.js (167KB → 54KB gz)     ← React bundle
├── chunks/
│   └── browser-polyfill-*.js (9.8KB → 2.9KB gz)
├── icons/
│   ├── icon16.png (698B)
│   ├── icon48.png (18KB)
│   └── icon128.png (34KB)
└── _locales/
    ├── en/messages.json (6.9KB)
    ├── pt_BR/messages.json (7.1KB)
    ├── es/messages.json (7.2KB)
    ├── fr/messages.json (7.3KB)
    ├── de/messages.json (7.3KB)
    ├── ja/messages.json (7.5KB)
    └── zh_CN/messages.json (6.9KB)

Total: ~500KB (uncompressed)
Total: ~150KB (gzipped)
```

---

## Troubleshooting

### Common Issues

**1. Read button doesn't appear**
- Check if content script is loaded: Open DevTools → Sources → Content Scripts
- Verify manifest permissions: activeTab, storage
- Check console for errors

**2. Voice not speaking**
- Ensure browser supports Web Speech API (Chrome, Edge, Safari)
- Check if TTS voices are installed (Windows Settings → Time & Language → Speech)
- Try different voice from popup settings

**3. Settings not saving**
- Check storage permissions in manifest
- Open DevTools → Application → Storage → Extension Storage
- Verify no errors in background service worker

**4. Extension not loading in Firefox**
- Use `dist-firefox/` folder (Manifest V2)
- Check `about:debugging` for errors
- Verify `browser_specific_settings.gecko.id` is set

### Debug Commands

```javascript
// In content script console
console.log(window.speechSynthesis.getVoices())

// Check storage
chrome.storage.local.get(null, (items) => console.log(items))

// Test TTS
const utterance = new SpeechSynthesisUtterance('Hello World')
window.speechSynthesis.speak(utterance)
```

---

## Future Enhancements

### Potential Features

1. **Text Preprocessing**
   - Skip URLs
   - Abbreviation expansion
   - Number formatting

2. **Advanced Controls**
   - Word highlighting during playback
   - Custom speed per paragraph
   - Auto-scroll to reading position

3. **Export/Import**
   - Save reading queue
   - Export as audio file
   - Import from clipboard

4. **Statistics**
   - Words read per day
   - Total time listening
   - Most used voices

5. **Accessibility**
   - Screen reader support
   - High contrast mode
   - Font size options

6. **Cloud Sync**
   - Sync settings across devices
   - Reading history
   - Custom voice profiles

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone <repo-url>
cd text-reader-extension

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build          # Chrome/Edge
npm run build:firefox  # Firefox

# Run linting
npm run lint

# Format code
npm run format
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config with custom rules
- **Prettier**: 2-space indentation, single quotes
- **Naming**: camelCase for functions, PascalCase for components
- **Comments**: JSDoc for public APIs

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@example.com

---

**Last Updated**: December 30, 2025  
**Version**: 1.0.0  
**Maintained by**: Your Name
