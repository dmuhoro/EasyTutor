/**
 * Local Profile Management (Shared-Device Support)
 *
 * Allows multiple learner profiles on a single device, each with isolated
 * data (progress, roadmaps, study history, wrong answers). Profiles are
 * stored locally in AsyncStorage and can be optionally protected by a PIN.
 *
 * No Supabase auth is required for local profiles — they work fully offline.
 * When a user later signs in to Supabase, their local profile data can be
 * synced to the cloud under their user_id.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalProfile {
  id: string;                          // stable UUID-like id
  name: string;                        // display name
  avatar?: string;                     // emoji avatar
  createdAt: string;                   // ISO timestamp
  lastActiveAt: string;                // ISO timestamp
  pinHash?: string;                    // SHA-256 hash of PIN (optional)
  supabaseUserId?: string;             // linked Supabase user (optional)
}

const PROFILES_STORAGE_KEY = 'easytutor-local-profiles';
const ACTIVE_PROFILE_STORAGE_KEY = 'easytutor-active-profile-id';

/**
 * Hash a PIN using a simple deterministic hash (for local-only protection).
 * Not cryptographically strong — suitable for deterring casual access, not
 * serious security. For production, replace with a proper KDF.
 */
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Load all local profiles from AsyncStorage.
 */
export const loadProfiles = async (): Promise<LocalProfile[]> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * Save all profiles to AsyncStorage.
 */
const saveProfiles = async (profiles: LocalProfile[]): Promise<void> => {
  await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
};

/**
 * Create a new local profile.
 */
export const createProfile = async (
  name: string,
  avatar: string = '👤',
  pin?: string
): Promise<LocalProfile> => {
  const profiles = await loadProfiles();
  const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const profile: LocalProfile = {
    id,
    name,
    avatar,
    createdAt: now,
    lastActiveAt: now,
    ...(pin ? { pinHash: hashPin(pin) } : {}),
  };
  await saveProfiles([...profiles, profile]);
  return profile;
};

/**
 * Get the currently active profile ID.
 */
export const getActiveProfileId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Set the active profile ID.
 */
export const setActiveProfileId = async (profileId: string | null): Promise<void> => {
  if (profileId) {
    await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
  } else {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
  }
};

/**
 * Get the active profile object.
 */
export const getActiveProfile = async (): Promise<LocalProfile | null> => {
  const id = await getActiveProfileId();
  if (!id) return null;
  const profiles = await loadProfiles();
  return profiles.find((p) => p.id === id) ?? null;
};

/**
 * Switch to a different profile.
 */
export const switchProfile = async (profileId: string): Promise<LocalProfile | null> => {
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return null;
  await setActiveProfileId(profileId);
  await AsyncStorage.setItem(
    PROFILES_STORAGE_KEY,
    JSON.stringify(
      profiles.map((p) =>
        p.id === profileId ? { ...p, lastActiveAt: new Date().toISOString() } : p
      )
    )
  );
  return profile;
};

/**
 * Delete a profile. If it's the active profile, clear the active ID.
 */
export const deleteProfile = async (profileId: string): Promise<boolean> => {
  const profiles = await loadProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  if (filtered.length === profiles.length) return false;
  await saveProfiles(filtered);
  const activeId = await getActiveProfileId();
  if (activeId === profileId) {
    await setActiveProfileId(null);
  }
  return true;
};

/**
 * Verify a PIN against a profile's stored hash.
 */
export const verifyPin = async (profileId: string, pin: string): Promise<boolean> => {
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile || !profile.pinHash) return true; // No PIN set = access granted
  return hashPin(pin) === profile.pinHash;
};

/**
 * Check if a profile has a PIN set.
 */
export const profileHasPin = async (profileId: string): Promise<boolean> => {
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  return !!(profile?.pinHash);
};

/**
 * Get or create the default profile (first-run experience).
 */
export const getOrCreateDefaultProfile = async (): Promise<LocalProfile> => {
  const activeId = await getActiveProfileId();
  if (activeId) {
    const profiles = await loadProfiles();
    const existing = profiles.find((p) => p.id === activeId);
    if (existing) return existing;
  }

  // No active profile — create a default "Learner" profile
  return await createProfile('Learner', '👤');
};
