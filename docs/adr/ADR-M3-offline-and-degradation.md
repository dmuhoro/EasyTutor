# ADR M3: Offline and degradation

## Problem
EasyTutor must keep working offline and during StashMind outages without regressing its existing online (Anthropic/Groq) and offline (local Ollama) modes.

## Decision
Online: EasyTutor's server calls StashMind for audio lessons, cards, and ask-the-source (behind flag `stashmind_enabled`, default OFF). Offline/outage: EasyTutor uses local Ollama with `@stashmind/core` prompts and schemas for cards and quizzes, and device text-to-speech (expo-speech). Dual-host audio (Gemini TTS via StashMind) is online-only. Clear online/offline/outage UI states; offline queue holds lesson requests for replay on recovery. The existing 181 tests stay untouched and green.

## Reasoning
Preserves offline continuity (non-negotiable) and graceful degradation; keeps existing modes working.

## Consequences
Offline quality depends on local Ollama model; device TTS varies by platform; offline queue needs idempotent replay.

## Cross-reference
StashMind `docs/adr/ADR-M3-offline-and-degradation.md`
