// supabase/functions/ai-proxy/index.ts
// Deno adapter: injects secrets from Deno.env and delegates to the Web-standard
// handler.ts, which holds all request logic and is exercised directly by vitest.
// The Groq key stays server-side; the client sends only its Supabase JWT.
// The model allowlist in handler.ts MUST stay in sync with src/config/registry.ts.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleProxyRequest, type ProxyEnv } from "./handler.ts";

serve((req) => {
  const env: ProxyEnv = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? undefined,
    SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined,
    GROQ_API_KEY: Deno.env.get("GROQ_API_KEY") ?? undefined,
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? undefined,
    ALLOWED_ORIGINS: Deno.env.get("ALLOWED_ORIGINS") ?? undefined,
  };
  return handleProxyRequest(req, env);
});
