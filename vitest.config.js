const path = require('path');

module.exports = {
  test: {
    globals: true,
    environment: 'node',
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
    ],
    setupFiles: [path.resolve(__dirname, 'tests/setupTests.ts')],
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'tests/mocks/react-native.ts'),
      'react-native-device-info': path.resolve(__dirname, 'tests/mocks/device-info.ts'),
    },
  },
};
