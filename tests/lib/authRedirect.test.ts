import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Platform and expo-linking before importing the module under test.
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));
vi.mock('expo-linking', () => ({
  createURL: vi.fn((path: string) => `easytutor:${path}`),
}));

import { buildAuthRedirect, EMAIL_CONFIRMATION_PATH, OAUTH_RETURN_PATH, PASSWORD_RESET_PATH, PASSWORD_UPDATED_PATH } from '../../lib/authRedirect';

describe('authRedirect — platform-safe redirect URLs (T6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports path constants', () => {
    expect(EMAIL_CONFIRMATION_PATH).toBe('/update-password');
    expect(OAUTH_RETURN_PATH).toBe('/');
    expect(PASSWORD_RESET_PATH).toBe('/update-password');
    expect(PASSWORD_UPDATED_PATH).toBe('/study');
  });

  it('builds web redirect using window.location.origin', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, origin: 'https://easytutor-ten.vercel.app' },
      configurable: true,
    });

    const url = buildAuthRedirect('/update-password');
    expect(url).toBe('https://easytutor-ten.vercel.app/update-password');
  });

  it('normalizes paths without leading slash', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, origin: 'https://example.com' },
      configurable: true,
    });

    const url = buildAuthRedirect('update-password');
    expect(url).toBe('https://example.com/update-password');
  });

  it('builds web redirect for OAuth return path', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, origin: 'https://easytutor-ten.vercel.app' },
      configurable: true,
    });

    const url = buildAuthRedirect(OAUTH_RETURN_PATH);
    expect(url).toBe('https://easytutor-ten.vercel.app/');
  });
});
