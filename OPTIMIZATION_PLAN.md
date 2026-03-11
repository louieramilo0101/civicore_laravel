# System Optimization Plan

## Executive Summary
This document outlines comprehensive performance optimizations for the CiviCore Laravel application. Multiple areas have been identified for improvement including database performance, session configuration, authentication, caching, and code efficiency.

---

## 1. Database Performance Optimization

### Issue: Using Raw SQL Instead of Eloquent ORM
All controllers use raw `DB::select()` queries instead of Laravel's Eloquent ORM, which:
- Misses query caching benefits
- No model relationships for eager loading
- Harder to maintain and debug

### Issue: No Database Indexes
- No index on `users.email` - used for every login
- No index on `documents.type` - used for filtering
- No index on `issuances.type` and `certNumber` - used for certificate numbering
- No index on `barangays.name` - used for sorting

### Issue: No Pagination
- All list endpoints fetch ALL records at once
- `UserController::index()` - fetches all users
- `DocumentController::index()` - fetches all documents  
- `IssuanceController::index()` - fetches all issuances

### Issue: Storing File Content in Database
- `DocumentController::upload()` stores file content directly in MySQL BLOB
- Large files slow down database queries significantly
- Memory-intensive for the application

**Solution:**
- Add database indexes via migration
- Implement pagination (e.g., 20-50 items per page)
- Move file storage to filesystem (already partially implemented with metadata)
- Create Eloquent models with proper relationships

---

## 2. Session Configuration Optimization

### Current Issues (config/session.php):
```php
'driver' => env('SESSION_DRIVER', 'array'),  // ❌ Not persistent
'encrypt' => env('SESSION_ENCRYPT', false), // ❌ Not secure
```

**Problems:**
- `array` driver loses all sessions on server restart
- No encryption means session data can be read
- File driver would be more persistent

**Solution:**
```php
'driver' => env('SESSION_DRIVER', 'file'),   // ✅ Persistent file storage
'encrypt' => env('SESSION_ENCRYPT', true),   // ✅ Encrypted sessions
```

---

## 3. Bcrypt Password Hash Cost Optimization

### Current Issue
- Default bcrypt cost is 10 (very secure but slow)
- Each login verification takes ~100-300ms
- For failed logins, this adds up to several seconds

**Solution:**
- Reduce bcrypt cost to 8 for this application (still secure, faster)
- Add config in `config/auth.php`:
```php
'password' => [
    'hash' => [
        'rounds' => env('BCRYPT_ROUNDS', 8),  // Reduced from 10
    ],
],
```

---

## 4. Caching Implementation

### Missing Caching
- No caching configured for frequently accessed data
- Templates are fetched on every request
- Barangays are fetched repeatedly
- User permissions parsed on every request

**Solution:**
- Cache templates with TTL (e.g., 60 minutes)
- Cache barangays list (rarely changes)
- Cache user data with shorter TTL
- Use Laravel's cache facade

---

## 5. API Response Optimization

### Issues Found:
1. **UserController** - No pagination, fetches all users
2. **DocumentController** - No pagination, fetches all documents
3. **IssuanceController** - No pagination, fetches all issuances
4. **Permissions parsing** - Done on every user fetch

**Solution:**
- Implement pagination on all list endpoints
- Add `?page=1&per_page=20` support
- Cache parsed permissions

---

## 6. Frontend Optimization Opportunities

### Issues in public/js/api.js:
- No request caching on client side
- No request deduplication
- Could benefit from optimistic updates

---

## Implementation Priority

### Phase 1: Quick Wins (Low Risk, High Impact)
1. ✅ Add database indexes (migration)
2. ✅ Optimize session configuration
3. ✅ Reduce bcrypt cost to 8

### Phase 2: Performance Improvements (Medium Risk)
4. Implement pagination on all list endpoints
5. Add caching for static/semi-static data
6. Fix file storage (use filesystem instead of DB)

### Phase 3: Code Quality (Low Priority)
7. Convert to Eloquent models
8. Add API response caching
9. Implement frontend caching

---

## Files to Modify

| File | Changes |
|------|---------|
| `config/session.php` | Change driver to 'file', enable encryption |
| `config/auth.php` | Add bcrypt rounds configuration |
| `database/migrations/` | Add indexes migration |
| `app/Http/Controllers/UserController.php` | Add pagination |
| `app/Http/Controllers/DocumentController.php` | Add pagination, optimize file storage |
| `app/Http/Controllers/IssuanceController.php` | Add pagination |
| `app/Http/Controllers/BarangayController.php` | Add caching |
| `app/Http/Controllers/TemplateController.php` | Add caching |

---

## Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should be faster)
- [ ] API pagination works correctly
- [ ] Session persists across requests
- [ ] File upload/download works
- [ ] OCR processing still works
- [ ] All existing functionality preserved

