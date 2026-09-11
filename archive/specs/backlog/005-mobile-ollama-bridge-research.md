# Spec 005: Mobile Ollama Bridge Research

## Goal
Research and prototype a way to connect the React Native app to an Ollama instance running on a remote server or tunneled from a host machine (e.g., via Ngrok or localtunnel) for physical device testing.

## Design
- **Tunneling:** Configure a persistent tunnel URL in `env.ts`.
- **Latency Test:** Measure response latency over the tunnel vs. localhost.

## Implementation Boundaries
- **File:** `lib/env.ts`, `lib/ollama.ts`.

## Verification Checklist
- [ ] Physical device can successfully generate an AI explanation over the tunnel.
- [ ] Environment variable `EXPO_PUBLIC_OLLAMA_URL` correctly overrides `localhost`.
