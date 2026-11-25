// Global test setup for Vitest
import { vi } from 'vitest';
import React from 'react';
import Module from 'node:module';

// Runtime require() of PNG assets (used by the auth screens) reaches Node's
// CJS loader, not Vite's alias. Register a binary-asset no-op in test only.
(Module as unknown as { _extensions: Record<string, (m: unknown, f: string) => void> })._extensions['.png'] =
  (m: unknown) => { (m as { exports: unknown }).exports = 1; };

// @expo/vector-icons ships JSX in its build output, which Vitest/Rolldown cannot
// parse. The real module is a native icon component; render a host stub so
// route smoke tests can mount screens that use icons (W1-4/T3).
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: ({ name, ...props }: Record<string, unknown>) =>
    React.createElement('Ionicons', { name, ...props }),
}));

// expo-linking and the google-fonts packages also ship syntax Vitest/Rolldown
// cannot parse. Only createURL() / useFonts() are consumed on the app path.
vi.mock('expo-linking', () => ({
  createURL: (path: string) => `easytutor://${String(path).replace(/^\//, '')}`,
  useURL: () => ({ url: null }),
  parse: (url: string) => ({ path: url }),
}));
// Native/markdown packages that ship JSX or native module registration code.
vi.mock('react-native-markdown-display', () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('Markdown', null, children as React.ReactNode),
}));
// NOTE: expo-modules-core is mocked exactly once, near the end of this file,
// with the local host stub. A second mock using importOriginal() loaded the
// package's raw `src/index.ts` through Node's CJS loader (intermittent
// `SyntaxError: Unexpected token 'typeof'` under full-suite load).

vi.mock('@expo-google-fonts/dm-sans', () => ({
  useFonts: () => [true, null],
  DMSans_400Regular: 2,
  DMSans_500Medium: 4,
  DMSans_600SemiBold: 5,
  DMSans_700Bold: 3,
}));

// react-native-safe-area-context ships Flow syntax that Vitest/Rolldown cannot
// parse. Only SafeAreaView is consumed by the app; render a host stub.
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('SafeAreaView', props, children as React.ReactNode),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: null,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
// Reuse legacy test setup to initialize mock Supabase and environment
import './setup';

// Provide a basic global mock for react-native-web specific modules that may be
// required by shared code in tests.
vi.mock('react-native', async () => await import('./mocks/react-native'));
vi.mock('react-native-device-info', async () => await import('./mocks/device-info'));
vi.mock('@react-native-async-storage/async-storage', async () => await import('./mocks/async-storage'));

// Ensure global environment variables expected by expo/react-native modules
// are present in the Node test environment.
(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).__DEV__ = (globalThis as any).__DEV__ ?? false;

// Minimal ExpoGlobal/EventEmitter shim for expo-modules-core
(globalThis as any).ExpoGlobal = (globalThis as any).ExpoGlobal || {};
class SimpleEventEmitter {
	addListener() {}
	removeAllListeners() {}
	emit() {}
}
(globalThis as any).ExpoGlobal.EventEmitter = (globalThis as any).ExpoGlobal.EventEmitter || SimpleEventEmitter;

// Mock expo modules that are pulled in by other packages (ensure these mocks
// are available early to avoid import-time errors).
vi.mock('expo-modules-core', async () => await import('./mocks/expo-modules-core'));
vi.mock('expo-constants', async () => await import('./mocks/expo-constants'));

// Silence analytics/telemetry console noise unless DEBUG=1
if (process.env.DEBUG !== '1') {
  // eslint-disable-next-line no-console
  (console as any).log = () => {};
  (console as any).info = () => {};
  (console as any).debug = () => {};
}
