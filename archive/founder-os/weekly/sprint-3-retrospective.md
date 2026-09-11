# Sprint 3 Retrospective — KCSE Question Bank + Momentum

## What worked
- Question bank → practice → mastery → recommendations → momentum formed a coherent loop without new frameworks.
- QuizEngine reuse kept quiz UX consistent across AI Literacy and KCSE practice.
- Offline-first AsyncStorage patterns scaled from literacy progress to streaks and mastery.

## Sprint 3 deliverables
| Day | Focus |
|-----|--------|
| 1 | Question bank schema, seed, retrieval, home screen |
| 2 | Practice sessions + QuizEngine integration |
| 3 | Subject mastery tracking |
| 4 | Adaptive recommendations |
| 5 | Learning momentum (streaks + score + dashboard) |

## Metrics impact (expected)
- Higher return rate via streak visibility.
- Clearer next action from recommendations + momentum dashboard.
- Better weak-topic targeting from mastery bands.

## Lessons
- Streak display must normalize broken days on read, not only on next practice.
- Single `recordPracticeMomentum()` hook prevents drift across practice completion paths.
