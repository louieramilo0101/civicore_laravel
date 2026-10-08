# CiviCORE - Comprehensive System Architecture & Engineering Documentation

## 1. System Overview

**CiviCORE** is an advanced Civic Document Management and Civil Registry Platform developed for Local Government Units (LGUs). The system accelerates the digitization of civil registry records, streamlines citizen service requests via QR code ticketing, enforces strict data privacy and retention policies, provides geospatial demographic analytics, and guarantees point-in-time disaster recovery with zero data loss.

---

## 2. Technology Stack & Key Dependencies

### 2.1 Backend Architecture
- **Framework**: Laravel 12.x
- **Runtime**: PHP 8.2+
- **Database**: MySQL 8.0+ / MariaDB 10.4+ (with SQLite support for isolated environments)
- **Queue System**: Laravel Database Queue Worker (`high`, `low`, `default` queues)
- **Task Scheduler**: Laravel Artisan Console Scheduler (`routes/console.php`)
- **Key Backend Packages**:
  - `google-gemini-php/client` / Gemini API REST client for multimodal document parsing
  - `simplesoftwareio/simple-qrcode` for dynamic SVG/PNG QR code ticket generation
  - `maatwebsite/excel` / `phpoffice/phpspreadsheet` for Excel report generation

### 2.2 Frontend Architecture
- **Library**: React 19
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x
- **Animation**: Framer Motion
- **Icons**: Heroicons v2 (`@heroicons/react`)
- **GIS Mapping**: Leaflet.js (`react-leaflet`) with custom GeoJSON boundaries for Naic barangays
- **Charts & Visualizations**: Chart.js (`react-chartjs-2`)

---

## 3. Core Modules & Implementation Details

### 3.1 Google Gemini AI OCR Pipeline (`OcrFormPanel.jsx`, `DocumentController.php`)
- **Model**: `gemini-2.5-flash`
- **Supported Form Types**:
  - **LCR Form 102 (Certificate of Live Birth)**: Extracts registry number, child full name, gender, date of birth, time of birth, place of birth, parents' full names and demographics, marriage of parents, attendant details, and informant.
  - **LCR Form 103 (Certificate of Death)**: Extracts registry number, deceased full name, date of death, place of death, age, marital status, citizenship, immediate/antecedent/underlying causes of death, and medical certifier.
  - **LCR Form 101 (Certificate of Marriage)**: Extracts registry number, contracting parties (husband & wife), citizenship, residence, parents, solemnizing officer, license number, and marriage date.
- **Resilient Date Normalization (`normalizeDateToYMD`)**:
  - Implements timezone-safe parsing on the client side to avoid the UTC date-shift bug (e.g. converting local calendar dates to a previous day).
  - Handles formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `M/D/YYYY`, ISO 8601 strings, and written textual dates.
- **Name Standardization**:
  - Automatically enforces uppercase styling across all name inputs.
  - Enforces `LASTNAME, FIRSTNAME MIDDLENAME [SUFFIX]` format for individual records and `HUSBAND & WIFE` format for marriages.

### 3.2 Scanned Image Post-Processing Studio (`ImagePostFxModal.jsx`)
- **Purpose**: Gives registrars complete in-browser control to clean up degraded or crooked paper scans prior to saving or OCR ingestion.
- **Capabilities**:
  1. **90° Step Lossless Rotation**: 0°, 90°, 180°, and 270° orientation corrections.
  2. **Binarization Filter (Black & White)**: Dynamic high-contrast threshold filter optimized for carbon copies, faint ink, and yellowed paper to improve OCR character extraction accuracy.
  3. **Interactive 4-Corner Crop & Perspective Framing**: User can drag 4 corner control handles on top of the preview canvas to adjust document framing.
  4. **Canvas Pipeline**: Generates an optimized image `Blob` directly in the browser and feeds it into the document attachment queue.

### 3.3 Automated Backup & Disaster Recovery Architecture (`BackupService.php`, `Backups.jsx`)
- **Service Layer**: `App\Services\BackupService`
  - Creates timestamped ZIP archives containing `database.sql` (or SQLite database), `files/*` (all physical files from `storage/app/public`), and `manifest.json`.
  - Enforces strict private file permissions (`0700`) outside the public web root in `storage/app/backups/`.
- **Scheduled Automated Backups**:
  - **Daily**: 2:00 AM (7-day retention).
  - **Weekly**: Sunday 3:00 AM (4-week retention).
  - **Monthly**: 1st of the month at 4:00 AM (6-month retention).
  - **Semi-Annual**: Jan 1 and Jul 1 at 5:00 AM (2-year retention).
  - **Auto-Pruning**: Daily at 6:00 AM via `backup:prune`.
- **Point-in-Time Restoration & Safety Guard**:
  - Prior to executing any restore, the system automatically creates a `pre_restore` backup snapshot of current live data.
  - Restoration runs inside a managed transaction and restores both SQL tables and physical storage files.
- **SuperAdmin Web Console (`/backups`)**:
  - Table of all backup packages with status, retention category, file count, and byte size.
  - Manual backup generation modal.
  - Safe restoration modal requiring the operator to type `CONFIRM RESTORE` before proceeding.
  - Direct browser downloads are blocked to prevent unauthorized data exfiltration.
- **Emergency CLI Disaster Recovery Script (`civicore_backup_recovery.bat`)**:
  - Provides a standalone Windows CLI menu for disaster recovery when the web server is offline.

### 3.4 User Account Management & Zero Data Loss Policy (`UserController.php`, `Accounts.jsx`)
- **Schema**: `users.is_active` (boolean, indexed).
- **Soft-Disable Architecture**:
  - Standard user deletion is replaced with soft account deactivation (`is_active = false`).
  - Preserves all historical linkages: documents created, issuances approved, and activity audit logs are never orphaned.
  - SuperAdmin self-disablement is prohibited at the controller level.
- **Session Revocation**:
  - Upon deactivating a user, all active sessions in the `sessions` table are immediately deleted.
  - Middleware (`RequireSessionAuth`) and `AuthController` reject deactivated users with HTTP 403.
- **Web UI (`Accounts.jsx`)**:
  - Active and Disabled filter tabs.
  - Visual status badges and quick-toggle action buttons with confirmation modals.

### 3.5 Unified High-Aesthetic Pagination System (`Pagination.jsx`)
- **Component**: `resources/js/components/Pagination.jsx`
- **Features**:
  - Responsive desktop and mobile layout with accessible ARIA tags.
  - Page size selector (`10`, `25`, `50` records).
  - Smart numeric ellipsis pagination (`1, 2, ..., 7, 8, 9, ..., 20`).
  - Dynamic item counters (`Showing 1 to 10 of 48 records`).
- **Standardized Implementations**:
  - `Documents.jsx` (Civil Registry Documents)
  - `Issuances.jsx` (Approved Certificate Issuances)
  - `PendingRequests.jsx` (Citizen Ticket Queue)
  - `ArchiveManager.jsx` (Archived & Soft-Deleted Records)
  - `Reports.jsx` (Export Preview Table)
  - `Accounts.jsx` (User Management)

### 3.6 Citizen QR Code Ticketing & Queue Management (`PendingRequests.jsx`, `TicketScannerModal.jsx`)
- **Public Request Portal (`/request`)**:
  - Citizens choose certificate type (Birth, Marriage, Death), provide recipient information, and submit requests without requiring an account.
  - System generates a unique tracking number (`REQ-YYYYMMDD-XXXX`) and QR code.
- **Status Endpoint (`/ticket-status/{ticket_number}`)**:
  - Allows citizens to check live request progress via mobile device.
- **Staff Operations & Countertop Scanner**:
  - Real-time queue view with status progression: `Pending` $\rightarrow$ `Serving` $\rightarrow$ `Completed` $\rightarrow$ `Issued`.
  - Built-in webcam QR scanner modal allows staff to scan tickets directly from citizens' phones or printed stubs.
  - Seamless document attachment (`AttachDocumentModal.jsx`) links registry files to fulfilled tickets.

### 3.7 Geospatial Demographic Mapping Dashboard (`Mapping.jsx`)
- **Interactive Map**: Geofenced to Naic, Cavite with barangay polygons.
- **Analytics Overlays**:
  - Heatmap density overlay based on document concentration.
  - Birth-to-Death demographic ratio indicators per barangay.
  - Leaderboard showing top barangays by document volume.
- **Temporal Filtering**: All Time, Today, This Week, This Month, This Year, or Custom Date Interval.

### 3.8 Custom Reporting & Export Suite (`Reports.jsx`)
- **Export Engines**: Native CSV and Microsoft Excel (`.xlsx`).
- **Filter Parameters**:
  - Date range (From / To).
  - Record category (Issuances, Documents, Service Requests).
  - Certificate type (Birth, Death, Marriage).
  - Lifecycle status.
  - Barangay jurisdiction.
- **Live Summary Metrics**: Real-time counter of matching records, distribution breakdown, and formatted data preview table.

---

## 4. API Endpoints Reference

### 4.1 Authentication & Profile
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user; validates `is_active` status. |
| `POST` | `/api/auth/logout` | Authenticated | Clears current session and cookies. |
| `GET` | `/api/auth/session` | Authenticated | Validates session token; returns active user object. |
| `PUT` | `/api/users/{id}/profile` | Authenticated (Self) | Updates avatar, contact details, and display preferences. |

### 4.2 Document & OCR Operations
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/documents` | Staff / Admin | Lists civil registry documents with pagination and filters. |
| `POST` | `/api/documents` | Staff / Admin | Creates a new civil registry document record. |
| `POST` | `/api/documents/ocr` | Staff / Admin | Submits scanned file/image to Gemini AI for OCR field extraction. |
| `GET` | `/api/documents/{id}` | Staff / Admin | Retrieves detailed document metadata and scan asset URL. |
| `PUT` | `/api/documents/{id}` | Staff / Admin | Updates extracted or verified document fields. |
| `DELETE` | `/api/documents/{id}` | Staff / Admin | Soft-deletes document to archive. |

### 4.3 QR Ticketing & Queue Management
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/tickets` | Public | Submits a new citizen document request. |
| `GET` | `/api/tickets/{ticket_number}` | Public | Retrieves public request status and QR code payload. |
| `GET` | `/api/tickets` | Staff / Admin | Lists queue tickets with status filtering. |
| `PUT` | `/api/tickets/{id}/status` | Staff / Admin | Updates ticket lifecycle state (`Pending`, `Serving`, `Completed`, `Issued`). |
| `POST` | `/api/tickets/{id}/attach-document` | Staff / Admin | Attaches an approved registry document to a ticket. |

### 4.4 User & Role Management
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin / SuperAdmin | Lists system users with role and status indicators. |
| `POST` | `/api/users` | Admin / SuperAdmin | Creates a new staff or admin user account. |
| `PUT` | `/api/users/{id}` | Admin / SuperAdmin | Updates account information and role assignments. |
| `POST` | `/api/users/{id}/toggle-status` | SuperAdmin | Enables or disables user account without data loss. |
| `DELETE` | `/api/users/{id}` | Admin / SuperAdmin | Safely disables account (soft-deletion). |

### 4.5 System Backup & Disaster Recovery
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/backups` | SuperAdmin | Lists all available system backup archives and metadata. |
| `POST` | `/api/backups` | SuperAdmin | Triggers an immediate full system backup. |
| `POST` | `/api/backups/restore` | SuperAdmin | Restores system state from selected archive. |

---

## 5. Security Architecture & Disaster Recovery Plan

### 5.1 Air-Gapped Storage & Data Protection
- Backup archives are stored in `storage/app/backups/` outside the public web root.
- Web server configurations block direct HTTP/HTTPS access to storage directories.
- Download endpoints for database dumps are omitted to prevent data leakage.
- Passwords are encrypted using bcrypt hashing (`Hash::make`).

### 5.2 Zero Data Loss Account Deactivation
- Physical database rows in the `users` table are never purged when deactivating personnel.
- All historical issuance records, receipts, and activity audit logs remain tied to the originating user ID.
- Inactive users are rejected by the authentication guard and middleware.

### 5.3 Disaster Recovery Runbook
In the event of a catastrophic server or database failure:

1. **Option A: Web Console Recovery (If Web UI is accessible)**
   - Log in as SuperAdmin.
   - Navigate to **System Backups** (`/backups`).
   - Identify the desired snapshot from the backup list.
   - Click **Restore**, review the confirmation warning, type `CONFIRM RESTORE`, and submit.
   - A safety pre-restore snapshot will be generated automatically before database and file replacement.

2. **Option B: CLI Recovery (If Web UI is offline)**
   - Open Command Prompt / PowerShell as Administrator.
   - Navigate to the repository directory:
     ```cmd
     cd C:\laragon\www\civicore_laravel
     ```
   - Run the recovery utility:
     ```cmd
     civicore_backup_recovery.bat
     ```
   - Select `[1]` to view backup archives.
   - Select `[3]` and enter the desired backup filename (e.g. `civicore_daily_20261008_020000.zip`).
   - The utility will safely restore the database and physical attachments.

---

## 6. Maintenance & Verification Checklist

- **Daily Schedule Verification**: Verify scheduled tasks are running (`php artisan schedule:run`).
- **Storage Link Verification**: Ensure `public/storage` symlink points to `storage/app/public`.
- **Gemini OCR Verification**: Verify `GEMINI_API_KEY` in `.env` is valid and has active quota.
- **Vite Build Verification**: When updating frontend components, run `npm run build` to compile production assets.
