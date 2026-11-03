import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'AGL Finance — Finanças pessoais',
      short_name: 'AGL Finance',
      description: 'Um espaço para cuidar das suas finanças.',
      theme_color: '#365f49',
      background_color: '#f6f7f3',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'pt-BR',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'], cleanupOutdatedCaches: true },
  })],
})
