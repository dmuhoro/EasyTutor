const path = require('path');

// Integration suites require live infrastructure (PostgREST/Supabase) and run
// through scripts/security/run_evidence_rest_tests.sh. They are excluded from
// the hermetic unit suite so `npm test` stays deterministic.
module.exports = {
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'tests/mocks/react-native.ts'),
    },
  },
};
