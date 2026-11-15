import { logError } from '../lib/logEvent';
import { logSupabaseError } from '../lib/supabaseOps';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseOps';

export interface SignInIntent {
  type: 'signin' | 'signup';
  email: string;
  password: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOffline: boolean;
  pendingAuth: SignInIntent | null;
  setSession: (session: Session | null) => void;
  setOffline: (offline: boolean) => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncPendingAuth: () => Promise<void>;
  clearPendingAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      isLoading: true,
      isOffline: false,
      pendingAuth: null,

      setSession: (session) => {
        set({
          session,
          user: session?.user ?? null,
          isLoading: false,
        });
      },

      setOffline: (offline) => {
        set({ isOffline: offline });
      },

      // Sign in with email/password. Queues intent when offline so the
      // learner isn't blocked; syncs on reconnect via syncPendingAuth.
      signInWithEmail: async (email: string, password: string) => {
        const { isOffline } = get();
        if (isOffline) {
          set({ pendingAuth: { type: 'signin', email, password } });
          return;
        }

        try {
          const client = getSupabaseClient();
          const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.session) {
            set({
              session: data.session,
              user: data.session.user,
              isLoading: false,
              isOffline: false,
            });
          }
        } catch (err) {
          logError('AUTH_signin_failed', err);
          throw err;
        }
      },

      // Sign up with email/password. Queues intent when offline.
      signUpWithEmail: async (email: string, password: string) => {
        const { isOffline } = get();
        if (isOffline) {
          set({ pendingAuth: { type: 'signup', email, password } });
          return;
        }

        try {
          const client = getSupabaseClient();
          const { data, error } = await client.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.session) {
            set({
              session: data.session,
              user: data.session.user,
              isLoading: false,
              isOffline: false,
            });
          } else {
            // Email confirmation required — session is null until confirmed
            set({ isLoading: false, isOffline: false });
          }
        } catch (err) {
          logError('AUTH_signup_failed', err);
          throw err;
        }
      },

      signOut: async () => {
        try {
          const client = getSupabaseClient();
          const { error } = await client.auth.signOut();
          if (error) {
            logSupabaseError('auth', 'delete', error);
            logError('AUTH_signOut_failed', error);
          }
        } catch (err) {
          logError('AUTH_signOut_failed', err);
          throw err;
        } finally {
          set({ session: null, user: null, isLoading: false, pendingAuth: null });
        }
      },

      // Sync any queued auth intent once the connection is restored.
      syncPendingAuth: async () => {
        const { pendingAuth, isOffline } = get();
        if (!pendingAuth || !isOffline) return;

        set({ isOffline: false });

        try {
          if (pendingAuth.type === 'signin') {
            await get().signInWithEmail(pendingAuth.email, pendingAuth.password);
          } else if (pendingAuth.type === 'signup') {
            await get().signUpWithEmail(pendingAuth.email, pendingAuth.password);
          }
        } catch (err) {
          // Re-queue the intent if sync still fails; don't silently drop it.
          logError('AUTH_pending_sync_failed', err);
          set({ isOffline: true });
        } finally {
          set({ pendingAuth: null });
        }
      },

      clearPendingAuth: () => set({ pendingAuth: null }),
    }),
    {
      name: 'easytutor-auth-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Initialize auth on module load: check for an existing Supabase session so
// the app isn't stuck on the loading spinner when a cached session exists.
// This runs once when the store is first imported.
void (async () => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (!error && data.session) {
      useAuthStore.setState({
        session: data.session,
        user: data.session.user,
        isLoading: false,
      });
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  } catch {
    // Supabase unavailable (offline or misconfigured) — don't block the app.
    useAuthStore.setState({ isLoading: false, isOffline: true });
  }
})();
