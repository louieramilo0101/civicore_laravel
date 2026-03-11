# Optimization Implementation TODO

## Phase 1: Quick Wins (COMPLETED)

- [x] 1. Optimize Session Configuration (config/session.php)
  - Change driver from 'array' to 'file'
  - Enable session encryption
  
- [x] 2. Reduce Bcrypt Cost (config/auth.php)
  - Add bcrypt rounds configuration (cost 8)

- [x] 3. Add Database Indexes (new migration)
  - Index on users.email
  - Index on documents.type
  - Index on issuances.type and certNumber
  - Index on barangays.name

## Phase 2: Performance Improvements (COMPLETED)

- [x] 4. Implement Pagination
  - UserController::index()
  - DocumentController::index()
  - IssuanceController::index()

- [x] 5. Add Caching
  - TemplateController - cache templates (60 min)
  - BarangayController - cache barangays (24 hours)

- [x] 6. Optimize API responses
  - Return metadata with pagination info

## Pending: Run migration
- [ ] Run `php artisan migrate` to apply database indexes

