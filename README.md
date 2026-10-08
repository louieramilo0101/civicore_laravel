# CiviCORE - Civic Document Management & Civil Registry Platform

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.0-red?style=for-the-badge&logo=laravel" alt="Laravel Version">
  <img src="https://img.shields.io/badge/PHP-8.2+-purple?style=for-the-badge&logo=php" alt="PHP Version">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React Version">
  <img src="https://img.shields.io/badge/Gemini%20AI-Main%20OCR-green?style=for-the-badge&logo=google" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind Version">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Last%20Updated-October%202026-brightgreen?style=for-the-badge" alt="Last Updated">
</p>

---

## Overview

**CiviCORE** is an enterprise-grade Civic Document Management and Civil Registry Information System tailored for Local Government Units (LGUs), specifically engineered for the Municipality of Naic, Cavite.

The platform digitizes, automates, and secures civil registry workflows:
- **AI-Powered OCR Document Ingestion**: Seamless character recognition and form mapping powered by **Google Gemini AI (`gemini-2.5-flash`)** supporting Philippine civil registry forms:
  - **LCR Form 102** (Certificate of Live Birth)
  - **LCR Form 103** (Certificate of Death)
  - **LCR Form 101** (Certificate of Marriage)
- **Scanned Image Post-Processing Engine**: In-browser image adjustment modal featuring 90° lossless rotation, document binarization (high-contrast black & white filter for aged/yellowed archives), and interactive 4-corner perspective/crop adjustment.
- **Automated Backup & Disaster Recovery (DR)**: Multi-tier automated backup scheduler (Daily, Weekly, Monthly, Semi-Annual) with retention pruning, safety snapshot creation before restore, SuperAdmin web console, and a standalone emergency Windows recovery tool (`civicore_backup_recovery.bat`).
- **Account Security & Soft-Disable Architecture**: Role-based access control with zero-data-loss safe account disabling, real-time database session revocation, and immutable audit logs.
- **Citizen Digital Service Queue & QR Ticketing**: Contactless request submission generating unique QR code tickets with live tracking endpoints (`/ticket-status/{ticket_number}`) and a counter-top camera scanner for municipal staff.
- **Geospatial Demographic Analytics**: Interactive GIS mapping powered by Leaflet bounded to Naic barangay coordinates with density heatmaps, birth-to-death demographic ratios, and temporal range filtering.
- **Enterprise Reporting & Export Suite**: Filtered extraction of civil issuances, registry documents, and service requests into CSV and Excel (`.xlsx`) formats.
- **Unified High-Aesthetic Pagination & Responsive Design**: Seamless responsiveness across desktop, tablet, and mobile screens with custom paginated data grids.

---

## System Requirements

| Component | Minimum Specification | Recommended |
|---|---|---|
| **Operating System** | Windows 10 / 11, Ubuntu 22.04 LTS | Windows 11 / Server 2022 |
| **PHP Runtime** | PHP 8.2+ (`pdo_mysql`, `zip`, `gd`, `fileinfo`, `mbstring`, `curl`) | PHP 8.3 |
| **Node.js** | Node.js 18.x or 20.x | Node.js 20.x LTS |
| **Package Managers** | Composer 2.5+, npm 9.x+ | Composer 2.7+, npm 10.x+ |
| **Database Engine** | MySQL 8.0+ or MariaDB 10.4+ | MySQL 8.0 / MariaDB 10.11 |
| **AI OCR Engine** | Google Gemini API Key (`gemini-2.5-flash`) | Gemini Pro / Flash API Key |
| **Local Dev Suite** | Laragon Full, XAMPP, or Native Services | **Laragon Full** |

---

## Installation & Setup Guide

### 1. Clone the Repository
```bash
git clone https://github.com/louieramilo0101/civicore_laravel.git
cd civicore_laravel
```

### 2. Install Dependencies
```bash
# Install PHP backend dependencies
composer install

# Install Frontend dependencies
npm install
```

### 3. Environment Configuration
Copy the sample environment file and generate a secure application key:
```bash
cp .env.example .env
php artisan key:generate
```

Configure your `.env` parameters:
```env
APP_NAME=CiviCORE
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=civicore_laravel
DB_USERNAME=root
DB_PASSWORD=

# Google Gemini AI OCR Engine Key
GEMINI_API_KEY=your_gemini_api_key_here

# Mail Configuration (Mailtrap for local dev / SMTP for production)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM_ADDRESS="no-reply@civicore.gov.ph"
MAIL_FROM_NAME="${APP_NAME}"
```

### 4. Database Setup & Migrations
Execute all schema migrations (including document indexes, ticket tables, soft-delete rules, and account status fields):
```bash
php artisan migrate
```

Optionally seed initial reference data and administrative accounts:
```bash
php artisan db:seed
```

**Default Administrative Credentials (after seeding):**
- **SuperAdmin**: `superadmin@civicore.gov.ph` / `superadmin2024`
- **Admin**: `admin@civicore.gov.ph` / `admin2024`

### 5. Storage Symlink
Generate the public storage symlink for document scans, attachments, and generated QR code images:
```bash
php artisan storage:link
```

### 6. Build Frontend Assets
Compile production-ready JavaScript and Tailwind CSS bundles:
```bash
npm run build
```

---

## Operating the Application

### One-Click System Launcher (Windows)
A pre-configured orchestration script is included in the project root: `start-civicore.bat`.

Double-click `start-civicore.bat` or run:
```cmd
start-civicore.bat
```

This concurrently launches:
1. **Laravel HTTP Server** (`http://127.0.0.1:8000`)
2. **Vite Development Server** (Hot Module Replacement on port 5173)
3. **Queue Workers**:
   - `high`: Fast-path single-page scanner jobs.
   - `low`: Multi-page batch processing fan-out.
   - `default`: Email notifications, OTP dispatches, and system tasks.

Access the platform in your browser at:
**`http://localhost:8000`**

---

## System Architecture & Implemented Capabilities

### 1. Document Management & Google Gemini AI OCR
- **Primary OCR Model**: Uses `gemini-2.5-flash` with tailored JSON response schemas for high-speed, zero-hallucination document extraction.
- **Multi-Form Civil Registry Support**:
  - **LCR Form 102** (Live Birth): Child details, parent demographics, birth date/time, attendant, informant.
  - **LCR Form 103** (Death): Deceased profile, date/place of death, age, causes of death, medical certification.
  - **LCR Form 101** (Marriage): Contracting parties, parents, solemnizing officer, license numbers.
- **Variant Handling**: Intelligently handles both legacy forms (e.g., 1958 variants) and modern revised forms (1993+ revisions) without manual coordinate re-calibration.
- **SVG Preview Fallbacks**: Robust fallback display if scanned image files are missing or in non-standard formats.

### 2. Scanned Image Post-Processing Studio (`ImagePostFxModal.jsx`)
- **Lossless Rotation**: 90° step rotation (0°, 90°, 180°, 270°) to rectify misoriented mobile or flatbed scans.
- **Binarization Filter (Black & White)**: Dynamic high-contrast threshold filter optimized for fading ink, stamps, carbon copies, and yellowed registry paper, significantly boosting OCR accuracy.
- **Interactive 4-Corner Crop Bounds**: Draggable corner handles with live visual crop polygon to isolate certificate borders.
- **Client-Side HTML5 Canvas**: Canvas rendering outputs clean blobs directly into the upload/attachment pipeline.

### 3. Automated Backup & Disaster Recovery Architecture
- **Scheduled Automated Backups (`routes/console.php`)**:
  - **Daily**: Runs every night at 2:00 AM (kept for 7 days).
  - **Weekly**: Runs every Sunday at 3:00 AM (kept for 4 weeks).
  - **Monthly**: Runs on the 1st of every month at 4:00 AM (kept for 6 months).
  - **Semi-Annual (6 Months)**: Runs Jan 1 and Jul 1 at 5:00 AM (kept for 2 years).
  - **Pruning**: Automated daily retention cleanup at 6:00 AM via `backup:prune`.
- **Package Anatomy**:
  - Compressed `.zip` archive containing:
    - `database.sql` (MySQL dump) or `database.sqlite`.
    - `files/*` (All physical uploads and attachments from `storage/app/public`).
    - `manifest.json` (Application metadata, timestamps, checksum, backup type, and file counts).
- **Point-in-Time Disaster Recovery**:
  - **Safety Pre-Restore Snapshot**: Automatically creates a `civicore_pre_restore_<timestamp>.zip` snapshot before touching the live database or storage.
  - **SuperAdmin Web Console (`/backups`)**: View backup history, view disk sizes, trigger on-demand backups, and perform restores with a type-to-confirm modal (`CONFIRM RESTORE`). Direct browser downloads are restricted for data exfiltration defense.
- **Artisan CLI Suite**:
  ```bash
  php artisan backup:run [--type=manual|daily|weekly|monthly|6month]
  php artisan backup:list
  php artisan backup:restore <filename>
  php artisan backup:prune
  ```
- **Disaster Recovery Batch Utility (`civicore_backup_recovery.bat`)**:
  - Standalone interactive batch script allowing immediate recovery even when web servers or web UIs are completely inaccessible.

### 4. Account Security & Soft-Disable Architecture (Zero Data Loss)
- **Database Schema**: Added indexed boolean `is_active` column to the `users` table (`database/migrations/2026_10_08_000001_add_is_active_to_users_table.php`).
- **Safe Account Disabling**: Eliminates destructive row deletion. When an administrator deactivates an account:
  - Account status is set to `is_active = false`.
  - All foreign keys, issuance signatures, audit history logs, and document records remain 100% intact.
- **Real-Time Session Revocation**: Disabling a user immediately purges their active sessions from the database `sessions` table.
- **Access Control & Guards**:
  - `AuthController::login()` returns `403 Forbidden` for disabled accounts.
  - `RequireSessionAuth` middleware checks active status on every authenticated request and immediately invalidates rogue sessions.
  - Self-disablement prevention: SuperAdmins are protected against disabling their own active accounts.
- **Accounts Management UI (`Accounts.jsx`)**:
  - Real-time Active / Disabled status badges.
  - Single-click status toggle with confirmation prompt.
  - Filter tabs: `All`, `Active`, `Disabled`.

### 5. Citizen QR Ticketing & Queue Management
- **Public Request Portal (`/request`)**: Citizens submit digital civil registry document requests without mandatory user registration.
- **Automatic QR Code Generation**: Generates a verifiable QR code ticket linked to `/ticket-status/{ticket_number}`.
- **Real-Time Registrar Queue (`PendingRequests.jsx`)**: Staff manage requests across lifecycle states:
  - `Pending` $\rightarrow$ `Serving` $\rightarrow$ `Completed` $\rightarrow$ `Issued`.
- **Integrated Ticket Scanner (`TicketScannerModal.jsx`)**: Staff can use counter-top webcams to scan physical or mobile QR tickets to instantly retrieve citizen records.
- **Document Attachment Pipeline (`AttachDocumentModal.jsx`)**: Directly link scanned archive documents to pending requests.

### 6. Geospatial Demographic Analytics Dashboard (`Mapping.jsx`)
- **Interactive Leaflet Mapping**: Geofenced to the Municipality of Naic, Cavite with barangay boundary layers.
- **Demographic Visualization Modes**:
  - **Heatmap Layer**: Spatial document concentration and request frequency per barangay.
  - **Demographic Ratios**: Vital birth-to-death ratios color-coded per locality.
  - **Barangay Leaderboard**: Real-time ranking of top document-origin jurisdictions.
- **Date Range Selectors**: Filter demographic trends by All Time, Today, This Week, This Month, This Year, or Custom Date Intervals.

### 7. Custom Reporting & Export Suite (`Reports.jsx`)
- Accessible via the navigation sidebar at `/reports`.
- **Dual Export Engines**: Full data extraction into **CSV** and native **Excel (.xlsx)** formats.
- **Granular Multi-Dimensional Filters**:
  - Date Ranges (From - To).
  - Certificate Types: Birth (102), Death (103), Marriage (101).
  - Statuses: Issued, Approved, Pending, Archived.
  - Barangay Jurisdictions.
- **Real-Time Metric Cards**: Instant calculation of total matching records, distribution percentages, and export previews.

### 8. Document Archive & Audit Logs (`ArchiveManager.jsx`)
- **Soft-Delete Architecture**: Civil documents are safeguarded against accidental deletion.
- **Restoration & Purge Controls**: Authorised staff can restore mistakenly archived records or permanently purge expired items.
- **Immutable Audit Trail**: Detailed activity logs capturing timestamp, user IP, user role, action type (view, create, edit, archive, print, restore), and target document IDs.

### 9. Unified Responsive Data Pagination (`Pagination.jsx`)
- Reusable, accessible pagination component with clean Tailwind UI styling.
- **Smart Numerical Windowing**: Displays dynamic page clusters with ellipses (`1, 2, ..., 7, 8, 9, ..., 20`).
- **Configurable Page Sizes**: Select 10, 25, or 50 items per view.
- **Responsive Layout**: Adapts gracefully to mobile and tablet screens.
- Standardized across `Documents.jsx`, `Issuances.jsx`, `PendingRequests.jsx`, `ArchiveManager.jsx`, `Reports.jsx`, and `Accounts.jsx`.

### 10. Standardization & Data Integrity Rules
- **Recipient Naming Standard**:
  - **Single Subject (Birth / Death)**: `LASTNAME, FIRSTNAME MIDDLENAME SUFFIX` (e.g., `DELA CRUZ, JUAN PEDRO JR.`).
  - **Joint Subject (Marriage)**: `HUSBAND_LASTNAME, HUSBAND_FIRSTNAME HUSBAND_MIDDLENAME & WIFE_LASTNAME, WIFE_FIRSTNAME WIFE_MIDDLENAME`.
  - Automatic uppercase formatting enforced on frontend input and backend persistence.
- **Date Normalization (`normalizeDateToYMD`)**:
  - Built-in timezone-safe date parser preventing off-by-one calendar shifts.
  - Normalizes ISO timestamps, slash dates (`MM/DD/YYYY`), dash dates (`YYYY-MM-DD`), and written dates into standard `YYYY-MM-DD`.

---

## Technical Specifications & Character Constraints

All form inputs are strictly validated on both client (React) and server (Laravel FormRequests) layers:

| Field Name | Type | Max Length | Validation Pattern / Rules |
|---|---|---|---|
| `registry_number` | String | 30 | Alphanumeric, hyphens, slashes (`^[A-Za-z0-9\-\/]+$`) |
| `last_name` / `husband_last_name` / `wife_last_name` | String | 50 | Alphabetic, spaces, hyphens, periods (`A-Z only`) |
| `first_name` / `husband_first_name` / `wife_first_name` | String | 50 | Alphabetic, spaces, hyphens, periods (`A-Z only`) |
| `middle_name` / `husband_middle_name` / `wife_middle_name` | String | 50 | Alphabetic, spaces, hyphens, periods (`A-Z only`) |
| `suffix` | String | 10 | Standard honorifics / suffixes (`JR, SR, II, III, IV`) |
| `barangay` | String | 100 | Must exist in registered Naic barangay list |
| `ticket_number` | String | 50 | System generated (`REQ-YYYYMMDD-XXXX`) |
| `contact_number` / `phone` | String | 15 | Numeric with optional leading plus (`^[+]?[0-9]{7,15}$`) |
| `email` | String | 100 | RFC 5322 compliant email format |
| `date_of_birth` / `date_of_death` / `date_of_marriage` | Date | 10 | ISO format (`YYYY-MM-DD`) |

---

## Key Artisan Console Commands

| Command | Description |
|---|---|
| `php artisan backup:run [--type=manual]` | Runs an immediate full system backup (Database + Storage attachments). |
| `php artisan backup:list` | Displays a table of all available backups with sizes and creation dates. |
| `php artisan backup:restore <filename>` | Restores the database and physical files from a specified backup archive. |
| `php artisan backup:prune` | Enforces retention policy, safely removing expired backup archives. |
| `php artisan schedule:run` | Manually triggers the Laravel Task Scheduler. |
| `php artisan queue:work --queue=high,low,default` | Starts processing asynchronous OCR and notification queues. |

---

## Disaster Recovery CLI Guide (`civicore_backup_recovery.bat`)

For scenarios where the web application or web server cannot be reached, use the bundled Windows Disaster Recovery utility:

1. Open Command Prompt as Administrator.
2. Navigate to the project root:
   ```cmd
   cd C:\laragon\www\civicore_laravel
   civicore_backup_recovery.bat
   ```
3. The interactive utility provides:
   - `[1] List all available backups`: Inspect timestamps and archive names.
   - `[2] Create immediate manual backup`: Run a fresh snapshot prior to maintenance.
   - `[3] Restore system from backup`: Point-in-time restoration with automated safety snapshot.
   - `[4] Prune expired backups`: Free up disk space according to retention policies.
   - `[5] Run scheduled tasks now`: Test scheduler execution.

---

## Summary of Completed Project Objectives

| ID | Feature / Module | Status | Technical Details |
|:---:|---|:---:|---|
| **1a** | OCR Document Search & Extraction | **Completed** | Camera overlay search & file upload scanning powered by Google Gemini AI (`gemini-2.5-flash`). |
| **1b** | Image Post-Processing Studio | **Completed** | In-browser 90° rotation, B&W binarization filter, and 4-corner crop adjustment modal. |
| **1c** | Geospatial Analytics | **Completed** | Leaflet map with Naic geofencing, heatmaps, birth-to-death ratios, and leaderboard rankings. |
| **1d** | Role-Based Access Control & Safe Accounts | **Completed** | Soft-disable user workflow (`is_active`), instant session invalidation, and role middleware. |
| **1e** | Issuance Approval Workflow | **Completed** | Official Receipt (OR) generation, issuance approval queue, and print authorization. |
| **1f** | Centralized Document Archive | **Completed** | Soft-delete, document restoration, permanent purge, and comprehensive audit trail logging. |
| **1g** | Citizen QR Code Ticketing System | **Completed** | Public request form, unique QR generation, `/ticket-status/{ticket_number}`, and counter scanner. |
| **1h** | Multi-Format Export Suite (`/reports`) | **Completed** | Custom CSV and Excel (`.xlsx`) export module with granular multi-parameter filtering. |
| **1i** | Backup & Disaster Recovery Architecture | **Completed** | Multi-schedule automated backups, auto-pruning, pre-restore snapshots, and recovery CLI. |
| **1j** | High-Aesthetic Responsive Pagination | **Completed** | Reusable `Pagination.jsx` component adopted across all primary data tables. |

---

## Future Roadmap

The following enhancements are staged for future releases:
- **Production SMTP Mail Gateway**: Transition from local sandbox (Mailtrap) to production SMTP (Google Workspace / AWS SES) for live citizen OTP and ticket updates.
- **SMS Gateway Integration**: Hooking automated SMS dispatch (Semaphore / Globe Labs) to the stored `phone` number when tickets move to *Serving* or *Issued*.
- **Multi-Factor Authentication (MFA)**: Optional authenticator app (TOTP) enforcement for SuperAdmin and Registrar staff logins.

---

## License

Developed by **Team CiviCORE**. Released under the [MIT License](https://opensource.org/licenses/MIT).
