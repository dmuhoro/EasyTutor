const path = require('path');

module.exports = {
  test: {
    globals: true,
    environment: 'node',
    // Bound worker concurrency: the default (one worker per CPU) oversubscribes
    // a machine that is also running the editor/browser. The flow tests cold-load
    // the store -> learning-port service graph (~2.3s alone); at 8 workers on a
    // loaded 8-core box they blow the 5s per-test timeout. Four workers finish the
    // whole suite in the same ~55s with 313/313 green, and cut peak memory.
    maxWorkers: 4,
    exclude: [
      '**/archive/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/integration/**',
      // Playwright specs live under tests/e2e but run under Playwright
      // (`npx playwright test`), never vitest. Collecting one here fails the
      // whole suite with "Playwright Test did not expect test.describe() to be
      // called here" and turns `npm test` red.
      '**/tests/e2e/e2e.test.ts',
      '**/tests/e2e/debug.test.ts',
      '**/tests/e2e/axe-a11y.test.ts',
      '**/tests/e2e/visual-baseline.test.ts',
    ],
    setupFiles: [path.resolve(__dirname, 'tests/setupTests.ts')],
  },
  resolve: {
    alias: [
      { find: 'react-native', replacement: path.resolve(__dirname, 'tests/mocks/react-native.ts') },
      { find: 'react-native-device-info', replacement: path.resolve(__dirname, 'tests/mocks/device-info.ts') },
      // Bare `@/` imports and bundled image assets cannot be parsed by Vitest.
      { find: /^@\//, replacement: path.resolve(__dirname) + '/' },
      { find: /\.(png|jpe?g|gif|webp)$/, replacement: path.resolve(__dirname, 'tests/mocks/asset.ts') },
    ],
  },
};
