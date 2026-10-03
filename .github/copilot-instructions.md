# Copilot instructions

## Project overview

- This is a standalone space-exploration quiz implemented in `index.html`.
- Keep the app self-contained: HTML, CSS, quiz data, and JavaScript belong in this file. Do not add a build step, server requirement, runtime dependency, or externally hosted asset.
- Preserve the mission-control visual style, narrow centered layout, and responsive behavior.

## UI and behavior

- Keep the quiz at 10 questions and update the score, progress bar, answer feedback, and results consistently if quiz behavior changes.
- Prevent moving to the next question before an answer is selected. Keep answer feedback distinct for correct and incorrect choices.
- Scores of 8 or higher trigger the results celebration. Keep decorative effects hidden from assistive technology.
- Preserve restart behavior and keyboard focus handoffs when moving between the welcome, quiz, and results screens.

## Accessibility and styling

- Use semantic HTML, descriptive accessible names, visible keyboard focus, and live announcements for changing quiz feedback.
- Preserve both `prefers-color-scheme: light` and `prefers-color-scheme: dark` styling; check contrast and interaction states in each theme.
- Respect `prefers-reduced-motion` for all animations, including star-field and results effects.
- Keep body text readable at 14-16px and maintain the narrow, responsive quiz column.

## Validation

- Preview `index.html` directly in the integrated browser; no server is needed.
- For interaction changes, check keyboard focusability and focus transitions, correct and incorrect feedback, score/progress updates, completing all questions, results, celebration threshold, and restarting.
