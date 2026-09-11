# Project Overview: EasyTutor

## Product Vision
EasyTutor is a multi-portal academic operating system designed to adapt to any student's learning level. It acts as a "Universal Professor" that dynamically re-architects its UI, prompts, and curriculum generation logic based on the user's portal (High School, University, or Self-Directed).

## Core User Types
1. **Kenyan High Schoolers:** Students following the KICD syllabus (KCSE subjects).
2. **University Students:** Undergraduates seeking academic rigor across diverse degrees (Medicine, Law, Engineering, etc.).
3. **Self-Directed Learners:** Explorer-mode users pursuing specific, goal-driven missions.

## Main Portals
- **High School (KICD-Aligned):** Form 1-4 level content, culturally tuned for Kenyan secondary education.
- **University (Academic Rigor):** Undergraduate-level academic logic, scholarly depth, and integrated exams.
- **Self-Directed (Explorer Mode):** Instant AI-architected roadmaps based on user-defined goals and Socratic guidance.

## Learning Philosophy
- **Adaptivity:** Content depth and tone change based on student mastery levels (Beginner, Intermediate, Advanced).
- **Socratic Method:** Particularly in Self-Directed mode, focusing on questioning to deepen understanding.
- **Validation:** JSON-integrity via Zod schemas and strict validation-retry loops to prevent AI hallucinations.

## Key Capabilities
- **Adaptive AI Tutoring:** Personalized explanations based on topic mastery.
- **Offline + Hybrid AI:** Local Ollama integration for resilience, falling back to cloud (Anthropic/Groq) for high-complexity tasks.
- **RAG Document Tutoring:** Retrieval-Augmented Generation for uploaded documents/books.
- **Session Intelligence:** Tracking mastery, XP, streaks, and habits to maintain engagement.

## Scope Boundaries
- **In-Scope:** Syllabus-aligned roadmap generation, AI-driven quiz generation, local-first RAG, progress tracking, and portal-specific UI.
- **Out-of-Scope:** Real-time multi-player collaboration (for now), direct video lecturing, and non-academic content generation.

## Success Criteria
- **Stability:** 0% JSON schema failures during AI generation.
- **Resilience:** Graceful degradation during network failures via local Ollama fallback.
- **Engagement:** Measurable growth in user streaks and XP trends.
- **Correctness:** Syllabus alignment for High School and University portals.
