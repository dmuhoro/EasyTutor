import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [
      './tests/setup.ts',
      path.resolve(__dirname, 'tests/setupTests.ts'),
    ],
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '~': path.resolve(__dirname),
      'react-native': path.resolve(__dirname, 'tests/mocks/react-native.ts'),
      'react-native-device-info': path.resolve(__dirname, 'tests/mocks/device-info.ts'),
    },
  },
});
