---
name: laravel
description: Use for Laravel-specific work involving routes, controllers, models, Eloquent, migrations, validation, middleware, Blade, authentication, configuration, or Laravel errors.
---

# Laravel

1. Check `composer.json` and the existing code to identify the Laravel version and project conventions.
2. Inspect only the files relevant to the request before editing.
3. Trace the route → middleware → controller → validation → model/database → response flow as needed.
4. Reuse existing routes, models, layouts, packages, and patterns. Avoid duplicate routes and unnecessary architecture.
5. For schema changes, inspect migrations and related code first. Prefer a new migration over undocumented manual schema changes.
6. Enforce authorization server-side. Frontend visibility is not access control.
7. Preserve CSRF protection, validation, and safe mass-assignment configuration.
8. Make the smallest coherent change. Check affected references after editing.
9. Run the narrowest useful checks, such as targeted tests, route listing, or syntax checks. Do not run destructive commands without explicit approval.

Explain the cause, files changed, and how to verify the result. Keep the explanation concise.
