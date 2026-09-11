# UI Context: EasyTutor Design System

## Visual Language
EasyTutor uses a sleek, technical, and premium aesthetic, primarily focused on a **dark mode first** experience. The visual language is inspired by high-end developer tools and academic platforms.

## Core Design Tokens

### Colors
- **Brand/Primary:** `#4f7cff` (Digital Blue).
- **Background:** `#0d0f12` (Deep Charcoal).
- **Surface (Card):** `#161920`.
- **Border:** `#2a2f3d`.
- **Text Primary:** `#ffffff`.
- **Text Secondary:** `#8a8fa3` (Muted Blue-Gray).
- **Accents:** Purple (`#8b5cf6`), Cyan (`#06b6d4`), Pink (`#ec4899`).

### Typography
- **Primary Font:** Syne (for headings) and DM Sans (for body text).
- **Scale:** Standard academic hierarchy (H1, H2, H3, Body, Caption).

### Spacing & Radius
- **Spacing Scale:** Multiples of 4/8 (sm: 8px, md: 16px, lg: 24px, xl: 32px).
- **Border Radius:** Soft technical curves (md: 12px, lg: 16px, xl: 24px).

## Component Patterns
- **Glassmorphism:** Suble use of background blur and transparency for elevated surfaces.
- **Micro-animations:** Smooth transitions using `react-native-reanimated` for card entries and progress bar increments.
- **Haptic Feedback:** Strategic use of `expo-haptics` for success, warning, and selection events.
- **Skeleton States:** Centralized loading states to indicate network boundaries.

## Interaction Philosophy
- **Mobile-First:** Touch targets are at least 44x44 pixels.
- **Immediate Feedback:** All interactions should provide visual or haptic confirmation.
- **Socratic Loading:** Loading messages are informative or educational (e.g., "Synthesizing your roadmap...").

## Portal-Specific Branding
- **High School:** Bright, energetic primary blue.
- **University:** Deep, scholarly purple accents.
- **Self-Directed:** Minimalist, technical cyan focus.

## Accessibility
- **Contrast:** Maintain AA/AAA contrast ratios for all text layers.
- **Screen Readers:** All interactive elements must have descriptive `accessibilityLabel` props.
