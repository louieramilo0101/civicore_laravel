---
name: code-review
description: Use when asked to review code for bugs, security issues, data integrity problems, regressions, or maintainability risks.
---

# Code Review

Review in priority order: correctness, security, data integrity, regressions, then maintainability/performance.

- Inspect the relevant code and call sites; do not assume unseen behavior.
- Report actionable findings first, with severity (Critical/High/Medium/Low).
- For each finding, identify the location, explain the consequence, and propose a practical fix.
- Separate confirmed bugs from possible risks and optional style suggestions.
- Do not rewrite the code unless asked. Do not flag personal style preferences as defects.
- If no issues are found in the inspected scope, state the scope and limits of the review.
