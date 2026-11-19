# ADR 002: Hybrid Cloud/Local AI Routing

Status: **Superseded for the hosted web app by ADR-010** (2026-11-19). The
default and complexity heuristic below remain historical for the original local
research track only; production selection is hosted proxy → opted-in Ollama →
offline through one pure selector.

## Problem
Relying solely on cloud AI (Anthropic/Groq) introduces costs and latency, while relying solely on local AI (Ollama) limits intelligence for complex tasks and consumes significant mobile device resources.

## Decision
Implement a **Hybrid Routing Layer** in `lib/aiProvider.ts`.
- **Default:** Route to local Ollama (`qwen2.5-coder:1.5b`) for low-to-medium complexity tasks.
- **Failover/High Intensity:** Route to cloud providers (Anthropic Claude 3.5 Sonnet) if:
  - Task complexity is marked as 'high'.
  - Input prompt length exceeds 4000 characters.
  - Mastery level is > 70% (requiring advanced scholarly reasoning).

## Reasoning
This balances operational costs with user experience. Users get fast, private, offline-capable responses for foundational learning, while still having access to elite-level intelligence for complex academic reasoning.

## Consequences
- Requires a running local Ollama instance on the development/host machine.
- Introduces complexity in testing, as both offline and online flows must be validated.

## Future Implications
Positions the app for total on-device intelligence once mobile-compatible LLMs (e.g., Llama 3.2 1B) reach sufficient reasoning parity.
