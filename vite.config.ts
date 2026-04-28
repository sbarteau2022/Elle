import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base './' lets Electron load assets via file:// in production builds
  base: process.env.ELECTRON ? './' : '/',
})
