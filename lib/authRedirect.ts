import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Build a platform-safe absolute URL for Supabase Auth redirects.
 *
 * On web: uses window.location.origin (e.g. https://easytutor-ten.vercel.app/update-password).
 * On native: uses expo-linking deep links (e.g. easytutor://update-password).
 *
 * Never references window.* directly in shared stores — this is the single
 * platform-aware entry point for auth redirect URLs.
 */
export function buildAuthRedirect(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (Platform.OS === 'web') {
    return `${window.location.origin}${normalized}`;
  }

  return Linking.createURL(normalized);
}

/** Path used after email confirmation completes (redirect target from signUp emailRedirectTo). */
export const EMAIL_CONFIRMATION_PATH = '/update-password';

/** Path used after OAuth completes (redirect target from signInWithOAuth redirectTo). */
export const OAUTH_RETURN_PATH = '/';

/** Path used after password reset email is clicked (redirect target from resetPasswordForEmail). */
export const PASSWORD_RESET_PATH = '/update-password';

/** Path used after password is successfully updated on /update-password. */
export const PASSWORD_UPDATED_PATH = '/study';
