# Tech Stack: EasyTutor

## Frontend Stack
- **Framework:** React Native + Expo SDK 55.
- **Routing:** Expo Router (File-based routing for portals).
- **Styling:** NativeWind (Tailwind CSS for React Native) for rapid, responsive UI development.
- **State Management:** Zustand for lightweight, performant global state with AsyncStorage persistence.
- **Components:** Radix UI-inspired patterns via `class-variance-authority` and `tailwind-merge`.

## AI Stack
- **Primary AI:** Anthropic Claude 3.5 Sonnet for complex reasoning and roadmap architecture.
- **High-Speed AI:** Groq (Llama 3.1) for low-latency fallback and quiz generation.
- **Local AI:** Ollama (`qwen2.5-coder:1.5b`) for offline-first resilience and embedding generation.
- **Schema Validation:** Zod for deterministic JSON structure enforcement.

## Backend & Database
- **Platform:** Supabase (PostgreSQL as a Service).
- **Persistence:** PostgreSQL for user profiles, progress, and curriculum data.
- **Vector Search:** `pgvector` for semantic document retrieval.
- **Security:** PostgreSQL Row Level Security (RLS) for multi-tenant data isolation.

## Tooling & Infrastructure
- **Local AI Tooling:** Ollama running locally on port 11434.
- **Testing:** Vitest for fast, unit and integration testing of AI flows and logic.
- **Deployment:** EAS (Expo Application Services) for mobile builds and OTA updates.
- **CI/CD:** GitHub Actions for automated linting, type-checking, and test execution.

## Why These Choices?
- **Expo SDK 55:** Provides a modern, stable foundation for cross-platform development with excellent native modules.
- **Supabase:** Offers a rapid, scalable backend with built-in auth and real-time capabilities.
- **Hybrid AI:** Ensures the app remains functional in offline environments (local Ollama) while maintaining elite intelligence in online states.
- **Zustand:** Significantly simpler and more performant than Redux for the majority of application state needs.
