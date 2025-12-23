# Read It For Me 🎙️

> Natural text-to-speech browser extension with smart language detection and premium voice selection

A powerful, accessible browser extension that converts any web content into natural-sounding speech. Perfect for accessibility, learning, multitasking, and productivity.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### Core Features
- 📝 **Smart Text Selection** - Select any text on any webpage
- 🗣️ **Natural Speech** - Human-like text-to-speech with advanced preprocessing
- 🌍 **Auto Language Detection** - Automatically detects page language and selects the best voice
- ⚡ **Premium Voice Selection** - Prioritizes Neural, Premium, and WaveNet voices
- 🎨 **Modern UI** - Beautiful glassmorphic design with gradient accents

### Voice Controls
- 🎚️ **Speed Control** - Adjust reading speed from 0.5x to 2.0x (default: 0.9x for natural sound)
- 🎵 **Pitch Control** - Fine-tune voice pitch from low to high
- 🔊 **Volume Control** - Independent volume slider
- ⏯️ **Full Playback Controls** - Play, pause, resume, and stop

### Smart Text Processing
- 🔤 **Abbreviation Expansion** - "Dr." → "Doctor", "e.g." → "for example"
- 💰 **Number & Currency** - "$100" → "one hundred dollars", "50%" → "fifty percent"
- 🔗 **URL & Email Cleanup** - Removes URLs and email addresses for cleaner speech
- 📊 **Acronym Handling** - "NASA" → "N. A. S. A." for clarity
- ✂️ **Markdown Stripping** - Removes formatting symbols for natural reading
- 🎭 **Quote Handling** - Announces quotes naturally

## 🚀 Installation

### For Users

#### Chrome/Edge
1. Download the latest release
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (top-right)
4. Click "Load unpacked"
5. Select the `dist` folder

#### Firefox
1. Download the latest release
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `dist` folder

### For Developers

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
```bash
npm run build
```

4. **Load in browser** (see user instructions above)

## 📖 Usage

1. **Select text** on any webpage
2. **Click** the extension icon in your toolbar
3. **Customize** voice settings (optional)
   - Voice is auto-selected based on language
   - Adjust speed, pitch, and volume to your preference
4. **Click "Read Text"** to start playback
5. **Use controls:**
   - Pause/Resume during playback
   - Stop to reset
   - Edit text directly in the textarea

### Tips
- 🌐 Extension auto-detects language from page metadata
- ⚡ Look for lightning bolt (⚡) for Neural voices
- ⭐ Look for star (⭐) for Premium voices
- 🟢 Green badge shows detected language code

## 🛠️ Development

### Project Structure
```
read-it-for-me/
├── public/
│   ├── manifest.json      # Extension manifest
│   └── icons/            # Extension icons
├── src/
│   ├── popup/
│   │   ├── App.tsx       # Main popup component
│   │   └── main.tsx      # React entry point
│   ├── content/
│   │   └── content.ts    # Content script for text selection
│   └── index.css         # Global styles
├── dist/                 # Built extension (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **APIs:** Web Speech API, Chrome Extension APIs

### Available Scripts
```bash
npm run dev      # Development mode with hot reload
npm run build    # Production build
npm run preview  # Preview production build
```

## 🎯 Roadmap

- [ ] Word highlighting during playback
- [ ] Keyboard shortcuts
- [ ] Save/load voice presets
- [ ] Reading history
- [ ] Export audio to file
- [ ] Dark mode theme
- [ ] Multilingual UI
- [ ] Browser action context menu

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

- Built with [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- Icons from [Heroicons](https://heroicons.com/)
- UI inspired by modern design principles

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/jorge-mendes-dev/read-it-for-me/issues)
- Email: [your-email@example.com]

---

Made with ❤️ by [Jorge Mendes](https://github.com/jorge-mendes-dev)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- ⚛️ React 18
- ⚡ Vite
- 🎨 Tailwind CSS
- 📘 TypeScript
- 🌐 Chrome Extension Manifest V3
- 🗣️ Web Speech API

## License

MIT
