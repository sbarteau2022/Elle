// Local vitest config — pins the test root here so vitest never walks up
// into the workbench's vite.config.ts (an Electron renderer config that this
// pure-TS test run must not inherit). Only the pure modules are unit-tested;
// React Native components are exercised in the running app.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
