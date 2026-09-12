// Deterministic, stable string-derived IDs for learning identities
// (free-form goals, user documents). Same seed → same UUID across devices
// and restarts, so upserts and checked-task keys stay idempotent.

const MIX = 0x9e3779b9;

export const stableHashId = (seed: string): string => {
  const str = String(seed);
  let h1 = (0x8f5a4f2b ^ str.length) >>> 0;
  let h2 = (0xa54e21c9 ^ str.length) >>> 0;

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 5) | (c >>> 3)), 2246822519) >>> 0;
  }
  h1 = Math.imul(h1 ^ (h2 >>> 13), MIX) >>> 0;
  h2 = Math.imul(h2 ^ (h1 >>> 17), MIX) >>> 0;

  let hex = '';
  let v = h1;
  for (let i = 0; i < 8; i++) {
    hex += (v & 0xf).toString(16);
    v = Math.floor(v / 16);
  }
  v = h2;
  for (let i = 0; i < 8; i++) {
    hex += (v & 0xf).toString(16);
    v = Math.floor(v / 16);
  }
  v = (h1 ^ h2) >>> 0;
  for (let i = 0; i < 8; i++) {
    hex += (v & 0xf).toString(16);
    v = Math.floor(v / 16);
  }
  v = (h1 + h2) >>> 0;
  for (let i = 0; i < 8; i++) {
    hex += (v & 0xf).toString(16);
    v = Math.floor(v / 16);
  }
  hex = hex.slice(0, 32).padEnd(32, '0');

  // Force RFC-4122 shape: version 4, variant '8'.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};