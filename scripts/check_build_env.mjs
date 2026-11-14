#!/usr/bin/env node
// Fails the production web build if any runtime-required env var is missing.
//
// Reads process.env, which Vercel populates from the project's Environment
// Variables at build time. This is the gate that catches a deployed bundle
// whose Supabase / AI keys were never configured — the failure mode that
// otherwise only surfaces as "[INFRASTRUCTURE ERROR] Supabase client
// unavailable" in a user's browser console.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const errors = [];

if (!url) errors.push('EXPO_PUBLIC_SUPABASE_URL missing');
else {
  try { new URL(url); } catch { errors.push('malformed EXPO_PUBLIC_SUPABASE_URL'); }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.replace(/\/+$/, '') + '/')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL does not point at a .supabase.co host');
  }
}

if (!key) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY missing');
else if (!key.startsWith('eyJ')) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT');

if (errors.length) {
  console.error('BUILD ENV FAIL:', errors.join('; '));
  process.exit(1);
}
console.log('Build env check passed.');