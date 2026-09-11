# EasyTutor — Project Brief

## What this is
A mobile-first self-learning platform built for Kenyan and self-directed learners.
Target users: high-school (KICD), university, and self-directed learners who want a
personal AI tutor — sign up, pick a subject, chat with a tutor, take a quiz, watch mastery grow.

## Current phase (Phase 1 — Learning app MVP)
Build and harden the learning core loop only: auth → subject → AI tutor chat → quiz → progress,
runnable on Expo Go and deployable on Vercel. Do NOT build trading, journaling, or file-storage
features yet. Commerce code is archived (`archive/lib/commerce`).

## Tech stack — do not deviate without asking
- React Native 0.83.6 + Expo SDK 55
- Expo Router (file-based navigation)
- NativeWind v4 (Tailwind for React Native)
- Supabase (database + auth + governed RLS reads/writes via `src/infrastructure/database`)
- Zustand + AsyncStorage (state + persistence, offline-first)
- AI routing (`lib/aiProvider.ts`, `lib/ai/reliability.ts`):
  - Primary (cloud): `claude-3-5-sonnet-latest` (Anthropic)
  - Fallback (cloud): `llama-3.1-8b-instant` (Groq)
  - Local (offline): Ollama at the user-configured URL (`ollamaModel`, default `llama3`)
- TypeScript strict everywhere — no new `any`; known `any` sites are a tracked backlog gap

## Design
- Background: #0d0f12
- Surface: #161920
- Accent: #4f7cff
- Fonts: Syne (headings), DM Sans (body)

## Agent rules
- Follow `CONSTITUTION.md` + `AGENTS.md` every session; `STATUS.md` is the source of truth.
- Small focused files, never one giant file
- NativeWind classes only, no inline styles
- All errors must show user-friendly messages
- Never install unapproved libraries without asking
- Never skip TypeScript types
- Archive, never delete