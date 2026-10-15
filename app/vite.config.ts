import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const html = (path: string) => resolve(root, path)

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: html('index.html'),
        about: html('about/index.html'),
        templates: html('templates/index.html'),
        features: html('features/index.html'),
        pricing: html('pricing/index.html'),
        faq: html('faq/index.html'),
        contact: html('contact/index.html'),
        privacy: html('privacy/index.html'),
        terms: html('terms/index.html'),
        arHome: html('ar/index.html'),
        arAbout: html('ar/about/index.html'),
        arTemplates: html('ar/templates/index.html'),
        arFeatures: html('ar/features/index.html'),
        arPricing: html('ar/pricing/index.html'),
        arFaq: html('ar/faq/index.html'),
        arContact: html('ar/contact/index.html'),
        arPrivacy: html('ar/privacy/index.html'),
        arTerms: html('ar/terms/index.html'),
      },
    },
  },
})
