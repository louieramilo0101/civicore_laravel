---
name: security
description: Use when handling login, roles/permissions, personal data, file uploads, APIs, user input, secrets, database access, or security reviews.
---

# Security

- Enforce authentication and authorization on the server for protected operations.
- Validate input on the server and use parameterized database access.
- Escape untrusted output; avoid raw HTML rendering unless content is trusted or safely sanitized.
- Preserve CSRF protection and safe mass-assignment rules.
- For uploads, validate size/type, generate safe storage names, and prevent execution of uploaded content.
- Never hard-code or expose credentials, tokens, private keys, or `.env` contents.
- Avoid logging passwords, tokens, or unnecessary sensitive data.
- Explain realistic impact and recommend the smallest practical mitigation.

Do not claim an application is secure after a superficial check. State the scope of any review.
