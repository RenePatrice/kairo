import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA installable et hors ligne (Workbox) : tout le build est mis en cache au premier
    // chargement, l'app fonctionne ensuite en mode avion.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['kairo-mark.svg', 'kairo-icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kairo',
        short_name: 'Kairo',
        description: 'Ta semaine, à ta façon : planificateur hors ligne et privé.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#080A14',
        theme_color: '#080A14',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
