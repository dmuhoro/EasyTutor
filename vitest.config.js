const path = require('path');

module.exports = {
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/archive/**',
      '**/node_modules/**',
      '**/dist/**',
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
