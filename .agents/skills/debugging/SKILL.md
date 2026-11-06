---
name: debugging
description: Use when something fails, throws an error, behaves unexpectedly, produces incorrect output, or a command/test fails.
---

# Debugging

1. Read the exact error and identify the failing operation, file, line, and stack trace if available.
2. Inspect relevant code and configuration; gather only the context needed to trace the failure.
3. Form a likely root cause and verify it against the code/error before changing anything.
4. Make the smallest fix that addresses the cause, not merely the symptom.
5. Run a targeted check or reproduction when possible.
6. Report what failed, why, what changed, and what verification was actually performed.

Do not hide errors, remove validation/security, disable CSRF, or broadly rewrite code to make an error disappear. If evidence is insufficient, say what remains uncertain.
