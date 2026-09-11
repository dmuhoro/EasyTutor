# Sprint 5 Day 1: Adaptive Learning Coach Dashboard

## Objective
Expose all Sprint 4 intelligence systems through a world-class student-facing experience. Surface existing intelligence.

## Features
1. **Dashboard Upgrade:** Sections for Learning Health, Memory Health, Learning Risks, Next Best Actions, Personalized Learning Plan, Weekly Study Plan, Progress Trends.
2. **Learning Health Score:** Composite score (0-100) based on mastery, confidence, retention, performance, and trend momentum. Classifications: Critical (<40), Weak (40-59), Stable (60-79), Strong (80-89), Elite (90+).
3. **Risk Center:** Display predicted weaknesses, severity, impact, and interventions.
4. **Action Center:** Display next best action, expected improvement, completion time.
5. **Study Planner:** Display daily tasks, weekly schedule, priorities, recovery/reinforcement plans.
6. **Progress Visualization:** Reusable trend cards for mastery, retention, and confidence.
7. **Empty States:** Handle new students, no data, and offline modes.

## Implementation Steps
1. Enhance `lib/recommendations.ts` to compute `learning_health_score` and `learning_health_classification`.
2. Ensure `learning_plan` is fully fetched and included in the dashboard payload.
3. Update `app/(shared)/learning-dashboard.tsx` to render the new sections.
4. Create reusable UI components in `components/ui/` for Trend Cards, Risk Alerts, Action Cards, and Plan Timelines.
5. Implement empty states across the UI.
6. Add integration tests in `tests/learningDashboard.test.ts`.
7. Run all validation scripts.
