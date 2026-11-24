// CORS for the hosted AI proxy. Web-standard APIs only, so this runs unchanged in
// Deno and in Node/vitest. Fail closed: an origin is reflected only when it is an
// exact, http(s) entry in the ALLOWED_ORIGINS allowlist. No wildcard is ever emitted.

export const CORS_ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';
export const CORS_ALLOW_METHODS = 'POST, OPTIONS';

/** Parse a comma-separated origin allowlist. Malformed, wildcard and non-http entries are dropped. */
export function allowedOrigins(value?: string | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const entry of value.split(',')) {
    const candidate = entry.trim().replace(/\/+$/, '');
    if (!candidate || candidate === '*') continue;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    if (parsed.origin !== candidate) continue;
    if (!out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/** CORS headers for one request. Vary is always set; ACAO only for an exact allowlist match. */
export function corsHeaders(origin: string | null, allowed: readonly string[]): Headers {
  const headers = new Headers();
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  headers.set('Access-Control-Allow-Methods', CORS_ALLOW_METHODS);
  if (origin && allowed.includes(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

export function preflightResponse(origin: string | null, allowed: readonly string[]): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}

export function jsonResponse(body: unknown, status: number, origin: string | null, allowed: readonly string[]): Response {
  const headers = corsHeaders(origin, allowed);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

/** Attach CORS headers to a response built elsewhere (the health probe). */
export function withCors(response: Response, origin: string | null, allowed: readonly string[]): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of corsHeaders(origin, allowed)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
