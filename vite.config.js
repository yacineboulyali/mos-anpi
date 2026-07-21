import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Génère un bundle transpilé (Babel + polyfills core-js) chargé via
    // <script nomodule> pour les navigateurs plus anciens (cibles définies
    // dans .browserslistrc), en plus du bundle moderne ES modules.
    legacy({
      modernPolyfills: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'QCM MOS — Entraînement OFPPT EFP Témara',
        short_name: 'QCM MOS',
        description: "Plateforme d'entraînement aux QCM de certification MOS (Excel, Word, PowerPoint, Excel Expert) — OFPPT EFP Témara",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F8F7',
        theme_color: '#00796B',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
