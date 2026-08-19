// Unit tests for the workbench's pure modules. Kept separate from
// vite.config.ts (a renderer/build config this run must not inherit) and
// scoped to src/ so it never walks into mobile/, which has its own vitest
// config and its own React Native toolchain.
//
// environment: 'node' — the renderers under test build React elements and are
// exercised through react-dom/server, so no DOM is needed and none is faked.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
