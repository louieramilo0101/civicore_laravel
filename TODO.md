# Login Fix TODO

## Steps:
- [x] Step 1: Update routes/api.php to wrap routes with 'web' middleware for session support
- [x] Step 2: Update resources/js/components/Login.jsx to add API call to /api/login, handle response, set sessionStorage, show loading/error states
- [ ] Step 3: Test login flow end-to-end
- [ ] Step 4: Clear caches if needed (route:clear, config:clear)
- [ ] Step 5: Complete task

**Notes:** CSS stays component-styled (Tailwind classes only, no global CSS changes).
