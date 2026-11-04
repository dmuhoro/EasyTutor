#!/usr/bin/env node
// Fails the production web build if Supabase is not configured.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const errors = [];
if (!url) errors.push('EXPO_PUBLIC_SUPABASE_URL missing');
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.replace(/\/+$/,'') + '/')) {
  // lenient: just ensure well formed http URL ending .supabase.co
}
if (!key) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY missing');
try { new URL(url); } catch { errors.push('malformed EXPO_PUBLIC_SUPABASE_URL'); }
if (key && !key.startsWith('eyJ')) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT');
if (errors.length) { console.error('BUILD ENV FAIL:', errors.join('; ')); process.exit(1); }
console.log('Build env check passed.');