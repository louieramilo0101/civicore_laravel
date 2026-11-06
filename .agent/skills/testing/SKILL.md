---
name: testing
description: Use when adding tests, verifying a feature or fix, checking regressions, or deciding how to test a change.
---

# Testing

- Identify the behavior and acceptance criteria before selecting tests.
- Inspect the project's existing test framework and patterns; do not add a testing dependency without need.
- Prefer focused tests for the changed behavior, including relevant validation, permissions, edge cases, and failure paths.
- Run the narrowest useful test first, then broaden only if needed.
- If tests cannot run, explain why and give the exact command the user can run.
- Report only checks that actually ran and their real outcomes. Distinguish tested behavior from unverified assumptions.
