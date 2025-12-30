import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, cpSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        mkdirSync('dist/icons', { recursive: true })
        copyFileSync('public/manifest.json', 'dist/manifest.json')
        copyFileSync('public/content-loader.js', 'dist/content-loader.js')
        // Copy the actual PNG icon files
        try {
          copyFileSync('public/icons/icon16.png', 'dist/icons/icon16.png')
          copyFileSync('public/icons/icon48.png', 'dist/icons/icon48.png')
          copyFileSync('public/icons/icon128.png', 'dist/icons/icon128.png')
        } catch (e) {
          console.log('Icon files not found, skipping...')
        }
        // Copy _locales folder
        try {
          cpSync('public/_locales', 'dist/_locales', { recursive: true })
        } catch (e) {
          console.log('Locales folder not found, skipping...')
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
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  }
})
