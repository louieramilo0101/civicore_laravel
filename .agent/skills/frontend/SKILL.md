---
name: frontend
description: Use for HTML, CSS, JavaScript, Bootstrap, Blade UI, responsive layout, browser behavior, forms, or frontend bugs.
---

# Frontend

- Inspect the relevant markup, styles, scripts, and existing framework/version first.
- Preserve existing design, form actions, field names, IDs, selectors, routes, and working behavior unless the task requires changing them.
- If Bootstrap is already used, reuse it; do not add another framework without a reason.
- Keep changes scoped to the requested component. Avoid duplicate CSS, unnecessary dependencies, and broad redesigns.
- Use semantic HTML, accessible labels, keyboard-friendly controls, and responsive layouts where relevant.
- Client-side validation improves UX but does not replace server-side validation.
- For bugs, check browser console/network errors and trace the relevant event or request.
- Verify the affected UI and explain which file/section changed.

## UI Content and Visual Style

- Never use emoji in the application's frontend unless the user explicitly requests emoji.
- Do not use emoji as icons, buttons, labels, navigation items, status indicators, headings, alerts, or decorative UI elements.
- Prefer text, CSS, Bootstrap Icons, SVG icons, or an existing project icon system when an icon is needed.
- Do not replace existing icons with emoji.
- Keep UI text professional, clean, and consistent with the project's existing design.
- Do not insert decorative symbols merely to make the interface look more colorful.
