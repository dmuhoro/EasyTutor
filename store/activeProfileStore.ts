/**
 * Active Profile Store
 *
 * Tracks the currently active local profile for shared-device support.
 * When a profile is switched, all governed stores (roadmap, progress, study)
 * should re-read data scoped to the new profile.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveProfileId, switchProfile } from '../lib/auth/localProfiles';

export interface ActiveProfileState {
  activeProfileId: string | null;
  isLoading: boolean;
  setActiveProfileId: (id: string | null) => void;
  switchToProfile: (id: string) => Promise<void>;
  clearActiveProfile: () => void;
}

export const useActiveProfileStore = create<ActiveProfileState>()(
  persist(
    (set) => ({
      activeProfileId: null,
      isLoading: false,

      setActiveProfileId: (id) => set({ activeProfileId: id }),

      switchToProfile: async (id) => {
        set({ isLoading: true });
        const profile = await switchProfile(id);
        if (profile) {
          set({ activeProfileId: profile.id, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      clearActiveProfile: () => {
        set({ activeProfileId: null, isLoading: false });
      },
    }),
    {
      name: 'easytutor-active-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Initialize active profile from persisted storage on module load
void (async () => {
  const id = await getActiveProfileId();
  if (id) {
    const store = useActiveProfileStore.getState();
    store.setActiveProfileId(id);
  }
})();
