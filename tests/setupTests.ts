// Global test setup for Vitest
import { vi } from 'vitest';
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
