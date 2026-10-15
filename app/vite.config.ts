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
        homeAr: html('index.html'),
        homeEn: html('en/index.html'),
        aboutAr: html('about/index.html'),
        aboutEn: html('en/about/index.html'),
        templatesAr: html('templates/index.html'),
        templatesEn: html('en/templates/index.html'),
        featuresAr: html('features/index.html'),
        featuresEn: html('en/features/index.html'),
        pricingAr: html('pricing/index.html'),
        pricingEn: html('en/pricing/index.html'),
        faqAr: html('faq/index.html'),
        faqEn: html('en/faq/index.html'),
        contactAr: html('contact/index.html'),
        contactEn: html('en/contact/index.html'),
        privacyAr: html('privacy/index.html'),
        privacyEn: html('en/privacy/index.html'),
        termsAr: html('terms/index.html'),
        termsEn: html('en/terms/index.html'),
      },
    },
  },
})
