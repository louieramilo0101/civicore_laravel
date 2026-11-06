---
name: sql
description: Use for MySQL or MariaDB queries, schema design, relationships, indexes, database errors, data integrity, or Laravel database work requiring SQL reasoning.
---

# SQL and Databases

- Inspect actual migrations/schema and existing queries before assuming table or column names.
- Use the project's existing database conventions and types.
- Use Eloquent, Query Builder, or parameterized queries. Never concatenate untrusted input into SQL.
- Check primary keys, foreign keys, nullability, uniqueness, indexes, and relationship cardinality when relevant.
- For UPDATE or DELETE, verify the target condition and affected rows first. Treat broad/destructive changes as requiring explicit approval.
- For schema changes, consider existing data, defaults, rollback behavior, and dependent code.
- Diagnose SQL errors from the exact message and schema; do not randomly rename columns or disable constraints.

When presenting SQL, state which data it reads or changes and whether it modifies records.
