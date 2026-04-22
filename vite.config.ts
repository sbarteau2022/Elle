import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
// VITE CONFIG — Elle Platform
//
// SOVEREIGN MODE TOGGLE
// ─────────────────────
// Set VITE_SOVEREIGN in .env.local to control routing:
//
//   VITE_SOVEREIGN=false  →  Cloud / Public-facing
//                             All API calls → Supabase Edge Functions
//                             Requires: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
//
//   VITE_SOVEREIGN=true   →  Sovereign / Local Elle
//                             All API calls → local Ollama instance
//                             Requires: VITE_OLLAMA_URL + VITE_OLLAMA_MODEL
//
// The toggle is read at runtime via import.meta.env.VITE_SOVEREIGN
// in src/lib/supabase.ts — no rebuild needed if using .env.local.
//
// ROUTES
// ──────
//   /        →  Observer Foundation public site
//   /app     →  ELLEai user platform (auth required)
//   /admin   →  Administration panel (admin access_tier required)
//
// Vercel rewrites all paths to index.html (see vercel.json).
// For local dev, Vite's historyApiFallback handles SPA routing.
// ============================================================

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // SPA fallback — all unknown paths serve index.html
    // Mirrors the vercel.json rewrite rule for local dev
  },
})
