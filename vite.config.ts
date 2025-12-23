import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        mkdirSync('dist/icons', { recursive: true })
        copyFileSync('public/manifest.json', 'dist/manifest.json')
        // For now, copy the SVG as a placeholder for all icon sizes
        try {
          copyFileSync('public/icons/icon128.svg', 'dist/icons/icon16.png')
          copyFileSync('public/icons/icon128.svg', 'dist/icons/icon48.png')
          copyFileSync('public/icons/icon128.svg', 'dist/icons/icon128.png')
        } catch (e) {
          console.log('Icon files not found, skipping...')
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
