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
utterance.rate = 0.9 // 0.1 to 10
utterance.pitch = 1 // 0 to 2
utterance.volume = 1 // 0 to 1

utterance.onend = () => {
  /* cleanup */
}
utterance.onerror = (e) => {
  /* handle error */
}
utterance.onboundary = (e) => {
  /* word tracking */
}

window.speechSynthesis.speak(utterance)
```

### Playback Control

```typescript
window.speechSynthesis.pause() // Pause
window.speechSynthesis.resume() // Resume
window.speechSynthesis.cancel() // Stop and clear
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
  const isEditable =
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

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
  recentVoices: [0, 5, 12], // indices only
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

---

name: design-principles
description: Enforce a precise, minimal design system inspired by Linear, Notion, and Stripe. Use this skill when building dashboards, admin interfaces, or any UI that needs Jony Ive-level precision - clean, modern, minimalist with taste. Every pixel matters.

---

# Design Principles

This skill enforces precise, crafted design for enterprise software, SaaS dashboards, admin interfaces, and web applications. The philosophy is Jony Ive-level precision with intentional personality — every interface is polished, and each is designed for its specific context.

## Design Direction (REQUIRED)

**Before writing any code, commit to a design direction.** Don't default. Think about what this specific product needs to feel like.

### Think About Context

- **What does this product do?** A finance tool needs different energy than a creative tool.
- **Who uses it?** Power users want density. Occasional users want guidance.
- **What's the emotional job?** Trust? Efficiency? Delight? Focus?
- **What would make this memorable?** Every product has a chance to feel distinctive.

### Choose a Personality

Enterprise/SaaS UI has more range than you think. Consider these directions:

**Precision & Density** — Tight spacing, monochrome, information-forward. For power users who live in the tool. Think Linear, Raycast, terminal aesthetics.

**Warmth & Approachability** — Generous spacing, soft shadows, friendly colors. For products that want to feel human. Think Notion, Coda, collaborative tools.

**Sophistication & Trust** — Cool tones, layered depth, financial gravitas. For products handling money or sensitive data. Think Stripe, Mercury, enterprise B2B.

**Boldness & Clarity** — High contrast, dramatic negative space, confident typography. For products that want to feel modern and decisive. Think Vercel, minimal dashboards.

**Utility & Function** — Muted palette, functional density, clear hierarchy. For products where the work matters more than the chrome. Think GitHub, developer tools.

**Data & Analysis** — Chart-optimized, technical but accessible, numbers as first-class citizens. For analytics, metrics, business intelligence.

Pick one. Or blend two. But commit to a direction that fits the product.

### Choose a Color Foundation

**Don't default to warm neutrals.** Consider the product:

- **Warm foundations** (creams, warm grays) — approachable, comfortable, human
- **Cool foundations** (slate, blue-gray) — professional, trustworthy, serious
- **Pure neutrals** (true grays, black/white) — minimal, bold, technical
- **Tinted foundations** (slight color cast) — distinctive, memorable, branded

**Light or dark?** Dark modes aren't just light modes inverted. Dark feels technical, focused, premium. Light feels open, approachable, clean. Choose based on context.

**Accent color** — Pick ONE that means something. Blue for trust. Green for growth. Orange for energy. Violet for creativity. Don't just reach for the same accent every time.

### Choose a Layout Approach

The content should drive the layout:

- **Dense grids** for information-heavy interfaces where users scan and compare
- **Generous spacing** for focused tasks where users need to concentrate
- **Sidebar navigation** for multi-section apps with many destinations
- **Top navigation** for simpler tools with fewer sections
- **Split panels** for list-detail patterns where context matters

### Choose Typography

Typography sets tone. Don't always default:

- **System fonts** — fast, native, invisible (good for utility-focused products)
- **Geometric sans** (Geist, Inter) — modern, clean, technical
- **Humanist sans** (SF Pro, Satoshi) — warmer, more approachable
- **Monospace influence** — technical, developer-focused, data-heavy

---

## Core Craft Principles

These apply regardless of design direction. This is the quality floor.

### The 4px Grid

All spacing uses a 4px base grid:

- `4px` - micro spacing (icon gaps)
- `8px` - tight spacing (within components)
- `12px` - standard spacing (between related elements)
- `16px` - comfortable spacing (section padding)
- `24px` - generous spacing (between sections)
- `32px` - major separation

### Symmetrical Padding

**TLBR must match.** If top padding is 16px, left/bottom/right must also be 16px. Exception: when content naturally creates visual balance.

```css
/* Good */
padding: 16px;
padding: 12px 16px; /* Only when horizontal needs more room */

/* Bad */
padding: 24px 16px 12px 16px;
```

### Border Radius Consistency

Stick to the 4px grid. Sharper corners feel technical, rounder corners feel friendly. Pick a system and commit:

- Sharp: 4px, 6px, 8px
- Soft: 8px, 12px
- Minimal: 2px, 4px, 6px

Don't mix systems. Consistency creates coherence.

### Depth & Elevation Strategy

**Match your depth approach to your design direction.** Depth is a tool, not a requirement. Different products need different approaches:

**Borders-only (flat)** — Clean, technical, dense. Works for utility-focused tools where information density matters more than visual lift. Linear, Raycast, and many developer tools use almost no shadows — just subtle borders to define regions. This isn't lazy; it's intentional restraint.

**Subtle single shadows** — Soft lift without complexity. A simple `0 1px 3px rgba(0,0,0,0.08)` can be enough. Works for approachable products that want gentle depth without the weight of layered shadows.

**Layered shadows** — Rich, premium, dimensional. Multiple shadow layers create realistic depth for products that want to feel substantial. Stripe and Mercury use this approach. Best for cards that need to feel like physical objects.

**Surface color shifts** — Background tints establish hierarchy without any shadows. A card at `#fff` on a `#f8fafc` background already feels elevated. Shadows can reinforce this, but color does the heavy lifting.

Choose ONE approach and commit. Mixing flat borders on some cards with heavy shadows on others creates visual inconsistency.

```css
/* Borders-only approach */
--border: rgba(0, 0, 0, 0.08);
--border-subtle: rgba(0, 0, 0, 0.05);
border: 0.5px solid var(--border);

/* Single shadow approach */
--shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

/* Layered shadow approach (when appropriate) */
--shadow-layered:
  0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.03),
  0 4px 8px rgba(0, 0, 0, 0.02);
```

**The craft is in the choice, not the complexity.** A flat interface with perfect spacing and typography is more polished than a shadow-heavy interface with sloppy details.

### Card Layouts Vary, Surface Treatment Stays Consistent

Monotonous card layouts are lazy design. A metric card doesn't have to look like a plan card doesn't have to look like a settings card. One might have a sparkline, another an avatar stack, another a progress ring, another a two-column split.

Design each card's internal structure for its specific content — but keep the surface treatment consistent: same border weight, shadow depth, corner radius, padding scale, typography. Cohesion comes from the container chrome, not from forcing every card into the same layout template.

### Isolated Controls

UI controls deserve container treatment. Date pickers, filters, dropdowns — these should feel like crafted objects sitting on the page, not plain text with click handlers.

**Never use native form elements for styled UI.** Native `<select>`, `<input type="date">`, and similar elements render OS-native dropdowns and pickers that cannot be styled. Build custom components instead:

- Custom select: trigger button + positioned dropdown menu
- Custom date picker: input + calendar popover
- Custom checkbox/radio: styled div with state management

**Custom select triggers must use `display: inline-flex` with `white-space: nowrap`** to keep text and chevron icons on the same row. Without this, flex children can wrap to new lines.

### Typography Hierarchy

- Headlines: 600 weight, tight letter-spacing (-0.02em)
- Body: 400-500 weight, standard tracking
- Labels: 500 weight, slight positive tracking for uppercase
- Scale: 11px, 12px, 13px, 14px (base), 16px, 18px, 24px, 32px

### Monospace for Data

Numbers, IDs, codes, timestamps belong in monospace. Use `tabular-nums` for columnar alignment. Mono signals "this is data."

### Iconography

Use **Phosphor Icons** (`@phosphor-icons/react`). Icons clarify, not decorate — if removing an icon loses no meaning, remove it.

Give standalone icons presence with subtle background containers.

### Animation

- 150ms for micro-interactions, 200-250ms for larger transitions
- Easing: `cubic-bezier(0.25, 1, 0.5, 1)`
- No spring/bouncy effects in enterprise UI

### Contrast Hierarchy

Build a four-level system: foreground (primary) → secondary → muted → faint. Use all four consistently.

### Color for Meaning Only

Gray builds structure. Color only appears when it communicates: status, action, error, success. Decorative color is noise.

When building data-heavy interfaces, ask whether each use of color is earning its place. Score bars don't need to be color-coded by performance — a single muted color works. Grade badges don't need traffic-light colors — typography can do the hierarchy work. Look at how GitHub renders tables and lists: almost entirely monochrome, with color reserved for status indicators and actionable elements.

---

## Navigation Context

Screens need grounding. A data table floating in space feels like a component demo, not a product. Consider including:

- **Navigation** — sidebar or top nav showing where you are in the app
- **Location indicator** — breadcrumbs, page title, or active nav state
- **User context** — who's logged in, what workspace/org

When building sidebars, consider using the same background as the main content area. Tools like Supabase, Linear, and Vercel rely on a subtle border for separation rather than different background colors. This reduces visual weight and feels more unified.

---

## Dark Mode Considerations

Dark interfaces have different needs:

**Borders over shadows** — Shadows are less visible on dark backgrounds. Lean more on borders for definition. A border at 10-15% white opacity might look nearly invisible but it's doing its job — resist the urge to make it more prominent.

**Adjust semantic colors** — Status colors (success, warning, error) often need to be slightly desaturated or adjusted for dark backgrounds to avoid feeling harsh.

**Same structure, different values** — The hierarchy system (foreground → secondary → muted → faint) still applies, just with inverted values.

---

## Anti-Patterns

### Never Do This

- Dramatic drop shadows (`box-shadow: 0 25px 50px...`)
- Large border radius (16px+) on small elements
- Asymmetric padding without clear reason
- Pure white cards on colored backgrounds
- Thick borders (2px+) for decoration
- Excessive spacing (margins > 48px between sections)
- Spring/bouncy animations
- Gradients for decoration
- Multiple accent colors in one interface

### Always Question

- "Did I think about what this product needs, or did I default?"
- "Does this direction fit the context and users?"
- "Does this element feel crafted?"
- "Is my depth strategy consistent and intentional?"
- "Are all elements on the grid?"

---

## The Standard

Every interface should look designed by a team that obsesses over 1-pixel differences. Not stripped — _crafted_. And designed for its specific context.

Different products want different things. A developer tool wants precision and density. A collaborative product wants warmth and space. A financial product wants trust and sophistication. Let the product context guide the aesthetic.

The goal: intricate minimalism with appropriate personality. Same quality bar, context-driven execution.
