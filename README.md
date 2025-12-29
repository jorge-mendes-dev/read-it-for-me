<div align="center">
  <img src="public/read it logo.png" alt="Read It For Me Logo" width="128" height="128">
  
  # Read It For Me 🎙️
  
  ### Natural text-to-speech with smart language detection and premium voice selection
  
  A powerful, accessible browser extension that converts any web content into natural-sounding speech. Perfect for accessibility, language learning, multitasking, and productivity.
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Firefox Add-on](https://img.shields.io/badge/Firefox-Available-orange)](https://addons.mozilla.org)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Coming%20Soon-green)](https://chrome.google.com/webstore)
  
</div>

## ✨ Features

### 🎯 Core Features
- **One-Click Reading** - Select text and click the floating button
- **Smart Language Detection** - Automatically detects and speaks 30+ languages
- **Premium Voice Selection** - Prioritizes Neural, Premium, and Enhanced voices
- **Floating Mini-Player** - Draggable controls that follow you across pages
- **Reading Queue** - Add multiple text selections to read sequentially
- **Privacy-Focused** - All processing happens locally, no data collection

### 🎚️ Playback Controls
- **Speed Control** - Adjust from 0.5x to 2.0x with quick presets (0.75x, 0.9x, 1.0x, 1.25x, 1.5x)
- **Pitch Control** - Fine-tune voice pitch to your preference
- **Volume Control** - Independent volume adjustment
- **Progress Tracking** - Real-time progress bar and time estimates
- **Full Controls** - Play, pause, resume, stop, and clear queue

### 🌍 Multi-Language Support
- **Interface Languages** - 7 fully translated languages (EN, PT-BR, ES, FR, DE, JA, ZH-CN)
- **Voice Detection** - Automatic best voice selection per language
- **Quality Indicators** - ⚡ marks premium/neural voices
- **Flag Emojis** - Visual language identification

### 🎨 User Experience
- **Collapsible Sections** - Voice selector, playback controls, advanced settings
- **First-Run Guide** - Welcome modal with helpful tips
- **Help Button** - Quick access to guide anytime
- **Modern Design** - Beautiful gradient UI with glassmorphic effects
- **Responsive Layout** - Works seamlessly on all screen sizes

## 🚀 Installation

### From Browser Stores

#### Firefox
[![Get the Add-on](https://img.shields.io/badge/Firefox-Get%20Add--on-FF7139?style=for-the-badge&logo=firefox-browser)](https://addons.mozilla.org)

#### Chrome/Edge (Coming Soon)
Chrome Web Store submission pending review.

### Manual Installation

#### Chrome/Edge
1. Download or build the extension (see Development section)
2. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist` folder from the extension directory

#### Firefox (Developer Version)
1. Download or build the extension
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select any file from the `dist-firefox` folder
## 💻 Development

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/jorge-mendes-dev/read-it-for-me.git
cd read-it-for-me
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the extension:**

For Chrome/Edge:
```bash
npm run build
```

For Firefox:
```bash
npm run build:firefox
```

4. **Load in browser** (see Installation section above)

### Development Commands

```bash
npm run dev              # Development mode with hot reload
npm run build            # Build for Chrome/Edge (Manifest V3)
npm run build:firefox    # Build for Firefox (Manifest V2)
npm run preview          # Preview production build
```

## 📖 Usage

### Getting Started

1. **Navigate to any webpage** with text content
2. **Select text** you want to hear read aloud
3. **Click the "Read This" button** that appears above your selection
4. **Enjoy** natural text-to-speech playback!

### Advanced Features

#### Floating Player
- **Drag to reposition** - Click and hold to move the player anywhere
- **Mini mode** - Toggle compact view for minimal screen space
- **Queue management** - Add multiple selections, clear queue anytime

#### Settings & Customization
- Click the **extension icon** in your browser toolbar to open settings
- **Voice Selection** - Browse voices by language with quality indicators (⚡)
- **Quick Presets** - One-click speed adjustment (0.75x, 0.9x, 1.0x, 1.25x, 1.5x)
- **Reset Defaults** - Restore original settings anytime
- **Auto-Detect Language** - Toggle automatic language detection

#### Tips & Tricks
- 🌐 Extension auto-detects page language from metadata
- ⚡ Look for lightning bolt for premium/neural voices
- 🎯 Save your favorite voice as default
- ❓ Click the help button (?) to reopen the welcome guide
- 🌍 Change interface language in settings

### Project Structure
```
read-it-for-me/
├── public/
│   ├── manifest.json           # Chrome/Edge manifest (MV3)
│   ├── manifest-firefox.json   # Firefox manifest (MV2)
│   ├── icons/                  # Extension icons
│   └── _locales/              # i18n translations (7 languages)
│       ├── en/
│       ├── pt_BR/
│       ├── es/
│       ├── fr/
│       ├── de/
│       ├── ja/
│       └── zh_CN/
├── src/
│   ├── popup/
│   │   ├── App.tsx            # Main popup UI component
│   │   ├── main.tsx           # React entry point
│   │   └── components/        # UI components
│   ├── content/
│   │   ├── content.ts         # Text selection & speech logic
│   │   ├── floatingPlayer.ts  # Floating player UI
│   │   └── modules/           # Utility modules
│   ├── background/
│   │   └── background.ts      # Background service worker
│   ├── types/                 # TypeScript definitions
│   ├── utils/                 # Helper utilities
│   └── index.css             # Global styles
├── dist/                      # Chrome/Edge build output
├── dist-firefox/              # Firefox build output
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json
```

### Tech Stack
- **Framework:** React 18 + TypeScript 5.5
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS 3.4
- **i18n:** Chrome Extension i18n API
- **APIs:** Web Speech API (speechSynthesis), Chrome Extension APIs
- **Browser Support:** Chrome 109+, Edge 109+, Firefox 79+

## 🗺️ Roadmap

### Implemented ✅
- ✅ Smart language detection (30+ languages)
- ✅ Premium voice selection with quality scoring
- ✅ Floating player with drag & mini mode
- ✅ Reading queue system
- ✅ Multi-language interface (7 languages)
- ✅ Collapsible settings sections
- ✅ First-run welcome guide
- ✅ Speed presets & custom controls
- ✅ Progress tracking & time estimates

### Planned Features 🚀
- [ ] Word highlighting during playback
- [ ] Keyboard shortcuts (Space to pause, Esc to stop)
- [ ] Save/load voice presets
- [ ] Reading history
- [ ] Export audio to file (MP3/WAV)
- [ ] Custom CSS themes
- [ ] Browser context menu integration
- [ ] Batch processing for multiple pages
- [ ] Cloud sync for settings (optional)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- Icons designed with [Heroicons](https://heroicons.com/)
- UI design inspired by modern glassmorphism principles
- Flag emojis for language identification
- Special thanks to all contributors and testers

## 📧 Contact & Support

- 🐛 **Report Issues:** [GitHub Issues](https://github.com/jorge-mendes-dev/read-it-for-me/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/jorge-mendes-dev/read-it-for-me/discussions)
- 📧 **Email:** [your-email@example.com]
- 🌐 **Website:** [Your Website]

## ⭐ Show Your Support

If you find this extension helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and suggesting features
- 🔀 Contributing code improvements
- 📢 Sharing with others who might benefit

---

<div align="center">
  
Made with ❤️ by [Jorge Mendes](https://github.com/jorge-mendes-dev)

[⬆ Back to Top](#read-it-for-me-)

</div>
