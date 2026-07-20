# Changelog

All notable changes to Read It For Me will be documented in this file.

---

## 🎉 [1.0.5] - Chrome Voice Experience Improvements - 2026-07-20

### ✨ New Features

#### 💡 Voice Help Panel

- Added a help panel (💡 button) with step-by-step instructions for getting more voices in Chrome
- Explains how to install Windows language packs, natural voices, and use internet-connected voices
- Warns when Google network voices aren't detected (possible connectivity issue)

#### ⚡ Recommended Voices Group

- Top 10 premium voices now appear in a dedicated "Recommended" group at the top of the voice selector
- Makes it easy to find the best available voices without scrolling

#### 🔍 Enhanced Voice Search

- Search now matches quality terms: "premium", "neural", "online", "offline", "google", "microsoft"
- Each voice shows its quality label (Neural, Premium, Online, Good, Basic)
- Cloud voices are indicated with ☁️ icon
- Voice count displayed in the selector label and dropdown header

### 🔧 Improvements & Fixes

- **Chrome Voice Loading**: Added polling mechanism (up to 2s) to reliably load voices in Chrome popups where `getVoices()` initially returns empty
- **Network Voice Capture**: Delayed check (3s) ensures Google cloud voices that load after local voices are properly captured
- **Content Script Reliability**: Voice loading in content scripts now uses both `voiceschanged` event AND polling as dual-strategy fallback
- **Better Voice Scoring**: Google network voices (`localService === false`) receive a +50 quality score boost; Google-branded voices get +45
- **Low-Quality Voice Detection**: eSpeak/MBROLA voices are penalized in scoring to avoid poor defaults
- **Few Voices Warning**: Shows an alert when fewer than 5 voices are detected with guidance on how to add more
- **Voice Type Legend**: Added legend showing ⚡ Premium, ☁️ Online, 💾 Offline indicators

### 🛠️ Technical Updates

- `useVoices` hook now returns `hasNetworkVoices` and `loadAttempts` for better state awareness
- `voiceScoring.ts` exports new `getVoiceQualityLabel()` and `getVoiceSearchTags()` utilities
- `ensureVoicesLoaded()` in content script uses race-condition-safe dual resolution strategy
- Voice selector uses custom `MenuList` component showing voice count in dropdown

---

## 🎉 [1.0.4] - Enhanced UI & Smart Features - 2026-05-19

### ✨ New Features

#### 🎯 Word Highlighting

- Real-time word highlighting as text is being read
- Smooth animations that follow the speech progress
- Visual feedback to keep you focused on the reading flow

#### 👁️ Follow Highlight

- Auto-scroll feature that keeps the highlighted word in view
- Perfect for reading long articles without manual scrolling
- Toggle on/off based on your preference

#### 📖 Smart Read

- Instantly detect and read full articles with one click
- Intelligent content detection filters out ads, navigation, and clutter
- Convenient floating button appears on article pages

#### 🌍 Auto Language Detection

- Automatically selects the best voice based on page language
- Supports 7 languages with premium voice quality
- Smart voice scoring for natural-sounding speech

### 🔧 Improvements & Fixes

- **Pause/Resume Enhancement**: Fixed long pause timeout issue—now restarts seamlessly from the exact position
- **Memory Optimization**: Resolved memory leaks in pause/resume functionality
- **Better Performance**: Cleaned up background processes for smoother operation
- **UI Polish**: Improved button animations and positioning
- **Component Consistency**: Unified utility classes across popup components for cleaner maintainability
- **Voice Selector Enhancement**: Improved UI with better grouping and responsive design

### 🛠️ Technical Updates

- Streamlined message passing between components for better reliability
- Enhanced cleanup processes to prevent resource leaks
- Added optimized select component for voice selection
- Standardized interactive button utilities for consistent behavior across UI
- TypeScript and type safety improvements

### 📦 Dependencies

- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.21
- Tailwind CSS 3.4.4

### 🌐 Browser Support

- Chrome 109+
- Edge 109+
- Firefox 79+

---

## [1.0.3] - Previous Release

...earlier releases...
