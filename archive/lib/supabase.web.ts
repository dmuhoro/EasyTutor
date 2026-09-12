import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logEvent } from './logEvent';

type SupabaseInitStatus = {
  available: boolean;
  urlExists: boolean;
  keyExists: boolean;
  urlValid: boolean;
  keyValid: boolean;
  error?: string;
};

type LoggedRequest = {
  table?: string;
  action: string;
  payload?: any;
  url: string;
  method: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

console.debug('[SUPABASE INIT]', { urlExists: !!supabaseUrl, keyExists: !!supabaseAnonKey });

function isValidSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function isValidAnonKey(value: string): boolean {
  return value.split('.').length === 3 && value.length > 80;
}

function getAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'select';
    case 'POST':
      return 'insert_or_rpc';
    case 'PATCH':
      return 'update';
    case 'PUT':
      return 'upsert_or_replace';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

function getTable(requestUrl: string): string | undefined {
  try {
    const parsed = new URL(requestUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const restIndex = segments.indexOf('v1');
    return restIndex >= 0 ? segments[restIndex + 1] : segments.at(-1);
  } catch {
    return undefined;
  }
}

function parsePayload(body?: BodyInit | null): any {
  if (!body || typeof body !== 'string') return undefined;
  try {
    return redactPayload(JSON.parse(body));
  } catch {
    return body;
  }
}

function redactPayload(value: any): any {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== 'object') return value;

  const sensitiveKeys = new Set([
    'password',
    'token',
    'access_token',
    'refresh_token',
    'provider_token',
    'provider_refresh_token',
  ]);

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sensitiveKeys.has(entryKey.toLowerCase()) ? '[REDACTED]' : redactPayload(entryValue),
    ]),
  );
}

function normalizeError(error: any, status?: number): Record<string, any> {
  if (error && typeof error === 'object') {
    return {
      status,
      message: error.message,
      hint: error.hint,
      details: error.details,
      code: error.code,
      raw: error,
    };
  }

  return {
    status,
    message: String(error),
  };
}

function buildRequest(fetchUrl: string | URL | Request, options?: RequestInit): LoggedRequest {
  const requestUrl = fetchUrl instanceof Request ? fetchUrl.url : fetchUrl.toString();
  const method = options?.method ?? (fetchUrl instanceof Request ? fetchUrl.method : 'GET');

  return {
    table: getTable(requestUrl),
    action: getAction(method),
    payload: parsePayload(options?.body ?? (fetchUrl instanceof Request ? undefined : null)),
    url: requestUrl,
    method,
  };
}

function createLoggedFetch() {
  return async (fetchUrl: string | URL | Request, options?: RequestInit) => {
    const start = Date.now();
    const request = buildRequest(fetchUrl, options);

    void logEvent('INFO', 'supabase_request', request);

    try {
      const response = await fetch(fetchUrl, options);
      const durationMs = Date.now() - start;

      if (!response.ok) {
        const responseText = await response.clone().text();
        let parsedError: any = responseText;

        try {
          parsedError = JSON.parse(responseText);
        } catch {
          // Keep raw text when Supabase returns a non-JSON body.
        }

        const error = normalizeError(parsedError, response.status);
        void logEvent('ERROR', 'supabase_request_failed', {
          table: request.table,
          action: request.action,
          error,
          payload: request.payload,
          status: response.status,
          durationMs,
        });

        console.error('[SUPABASE ERROR]', {
          table: request.table,
          action: request.action,
          status: response.status,
          message: error.message,
          hint: error.hint,
          details: error.details,
          payload: request.payload,
          durationMs,
        });
      }

      return response;
    } catch (error) {
      void logEvent('ERROR', 'supabase_network_failed', {
        table: request.table,
        action: request.action,
        error: normalizeError(error),
        payload: request.payload,
      });
      console.error('[SUPABASE NETWORK ERROR]', {
        table: request.table,
        action: request.action,
        error,
      });
      throw error;
    }
  };
}

const initStatus: SupabaseInitStatus = {
  available: false,
  urlExists: !!supabaseUrl,
  keyExists: !!supabaseAnonKey,
  urlValid: !!supabaseUrl && isValidSupabaseUrl(supabaseUrl),
  keyValid: !!supabaseAnonKey && isValidAnonKey(supabaseAnonKey),
};

if (!initStatus.urlExists || !initStatus.keyExists || !initStatus.urlValid || !initStatus.keyValid) {
  initStatus.error = 'Invalid Supabase configuration';
  void logEvent('ERROR', 'supabase_init_invalid_config', initStatus);
  console.error('[SUPABASE INIT ERROR]', initStatus);
}

const globalKey = '__easytutor_supabase_web_client__';
const globalStore = globalThis as typeof globalThis & {
  [globalKey]?: SupabaseClient | null;
};

function createSupabaseClient(): SupabaseClient | null {
  if (globalStore[globalKey] !== undefined) {
    return globalStore[globalKey] ?? null;
  }

  if (initStatus.error) {
    globalStore[globalKey] = null;
    return null;
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        fetch: createLoggedFetch(),
        headers: {
          'x-client-info': 'easytutor-web',
        },
      },
    });

    initStatus.available = true;
    globalStore[globalKey] = client;
    void logEvent('INFO', 'supabase_init_success', {
      urlHost: new URL(supabaseUrl).hostname,
      keyExists: !!supabaseAnonKey,
    });
    return client;
  } catch (error) {
    initStatus.error = error instanceof Error ? error.message : String(error);
    void logEvent('ERROR', 'supabase_init_failed', {
      error: initStatus.error,
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseAnonKey,
    });
    console.error('[SUPABASE INIT ERROR]', initStatus);
    globalStore[globalKey] = null;
    return null;
  }
}

export const supabase: SupabaseClient | null = createSupabaseClient();

export const supabaseInitStatus: SupabaseInitStatus = {
  ...initStatus,
  available: supabase !== null,
};

export const getSupabaseInitError = (): string | undefined => supabaseInitStatus.error;

export const isSupabaseAvailable = (): boolean => supabase !== null;
