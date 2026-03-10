# Task: Fix Login Error Popup Delay

## Problem
Login error popup takes 3-4 seconds to appear after submitting invalid credentials.

## Root Cause
The password verification logic in AuthController.php performs multiple checks:
1. First tries bcrypt verification (intentionally slow ~100-300ms)
2. Catches exception and tries plain text comparison
3. Does another plain text comparison
4. Attempts to upgrade plain text password to bcrypt (additional DB write)

This results in 3-4 second delay on failed login attempts.

## Solution
Optimize the login method to:
1. Check if password is bcrypt (starts with $2y$) before attempting Hash::check
2. Simplify verification logic - only one method needed
3. Remove password upgrade on failed attempts (only upgrade on successful login)
4. Early return on invalid credentials to avoid unnecessary processing

## Implementation Steps
- [x] Edit app/Http/Controllers/AuthController.php - optimize login method
- [ ] Test login with invalid credentials to verify faster error popup

