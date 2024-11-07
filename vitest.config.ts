import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    testTimeout: 10_000,
    coverage: {
      include: ['src/**'],
      provider: 'v8' as const,
      reporter: ['cobertura', 'text'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
