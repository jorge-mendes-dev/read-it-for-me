# Text Reader Browser Extension 🎙️

A browser extension that reads selected text aloud using the Web Speech API. Built with React, Vite, and Tailwind CSS.

## Features

- 📝 Select any text on a webpage and have it read aloud
- 🎚️ Adjustable reading speed (0.5x - 2x)
- 🎵 Adjustable pitch (0.5 - 2.0)
- 🗣️ Multiple voice options
- 🎨 Beautiful, modern UI with Tailwind CSS
- ⏯️ Play, pause, and stop controls

## Installation

### Development Mode

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load the extension in your browser:

#### Chrome/Edge:
- Open `chrome://extensions/` (or `edge://extensions/`)
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `dist` folder from the project

#### Firefox:
- Open `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select the `manifest.json` file from the `dist` folder

## Usage

1. Select any text on a webpage
2. Click the Text Reader extension icon in your browser toolbar
3. The selected text will appear in the popup
4. Customize voice, speed, and pitch settings
5. Click "Read Text" to hear the text read aloud

## Development

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
