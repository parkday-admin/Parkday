import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Parkday',
        short_name: 'Parkday',
        description: 'Plan smoother park days.',
        theme_color: '#0D2340',
        background_color: '#F0EDE8',
        display: 'standalone',
        orientation: 'portrait',
        scope: 'https://app.planyourparkday.com/',
        start_url: 'https://app.planyourparkday.com/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // public/ carries untracked design-reference mockups (multi-MB
        // static HTML dumps, id/class listings) alongside real app assets —
        // these aren't part of the app and shouldn't be precached.
        globIgnores: ['**/parkday_*.html', '**/Parkday Home*.html', '**/*_classes*.txt', '**/*_globals*.txt', '**/*_ids*.txt'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
})
