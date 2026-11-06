---
name: task-router
description: Use for multi-part features that span multiple layers or technologies, such as Laravel plus database plus frontend, or when the required work is unclear and needs coordination.
---

# Task Router

Select the minimum Skills needed for this task. Do not load every Skill by default.

- Laravel routes/controllers/models/Blade/migrations: `laravel`
- SQL/schema/relationships/query errors: `sql`
- HTML/CSS/JavaScript/Bootstrap/UI: `frontend`
- Errors or unexpected behavior: `debugging`
- Authentication, authorization, uploads, secrets, sensitive data: `security`
- Tests and verification plans: `testing`
- Requested code inspection/review: `code-review`

Workflow:
1. Inspect the project and summarize the requested outcome internally.
2. Identify affected layers and relevant existing files.
3. Use only the matching Skills; a task may need more than one.
4. Make a small implementation plan for complex changes.
5. Implement in coherent, limited edits.
6. Run focused verification and fix regressions introduced by the change.
7. Briefly summarize files changed, important decisions, and verification results.

Do not invoke this router for trivial single-file edits. Do not claim that mentioning a Skill guarantees it was loaded; use the instructions available in the current agent context.
