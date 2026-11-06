# CiviCORE - Civic Document Management & Civil Registry Platform

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.0-red?style=for-the-badge&logo=laravel" alt="Laravel Version">
  <img src="https://img.shields.io/badge/PHP-8.2+-purple?style=for-the-badge&logo=php" alt="PHP Version">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React Version">
  <img src="https://img.shields.io/badge/Gemini%20AI-Main%20OCR-green?style=for-the-badge&logo=google" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Ollama-Offline%20Vision%20OCR-orange?style=for-the-badge&logo=ollama" alt="Ollama Local OCR">
  <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind Version">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Last%20Updated-November%202026-brightgreen?style=for-the-badge" alt="Last Updated">
</p>

---

## Overview

**CiviCORE** is an enterprise-grade Civic Document Management and Civil Registry Information System tailored for Local Government Units (LGUs), specifically engineered for the Municipality of Naic, Cavite.

The platform digitizes, automates, and secures civil registry workflows:
- **Dual-Engine AI OCR Document Ingestion**: Flexible optical character recognition supporting Philippine civil registry forms (**LCR Form 102** Live Birth, **LCR Form 103** Death, and **LCR Form 101** Marriage) through two switchable engines:
  - **Google Gemini Cloud AI (`gemini-2.5-flash`)**: High-speed multimodal intelligence via Google GenAI SDK.
  - **Local Ollama Vision AI (`qwen2.5vl:3b`)**: 100% offline, private, on-premise vision inference ensuring citizen data never leaves the municipal network, with zero recurring API costs.
- **Scanned Image Post-Processing Engine**: In-browser image adjustment modal featuring 90° lossless rotation, document binarization (high-contrast black & white filter for aged/yellowed archives), and interactive 4-corner perspective/crop adjustment.
- **Automated Backup & Disaster Recovery (DR)**: Multi-tier automated backup scheduler (Daily, Weekly, Monthly, Semi-Annual) with retention pruning, AES-256-GCM envelope encryption, safety snapshot creation before restore, SuperAdmin web console, and a standalone emergency Windows recovery tool (`civicore_backup_recovery.bat`).
- **Account Security & Soft-Disable Architecture**: Role-based access control with zero-data-loss safe account disabling, real-time database session revocation, and immutable audit logs.
- **Citizen Digital Service Queue & QR Ticketing**: Contactless request submission generating unique QR code tickets with live tracking endpoints (`/ticket-status/{ticket_number}`) and a counter-top camera scanner for municipal staff.
- **Ticket Issuance Fulfillment Pipeline**: Dedicated separate tracking table (`ticket_issuances`) for requested citizen copies, keeping official civil registry archives separated from issued counter requests.
- **Geospatial Demographic Analytics**: Interactive GIS mapping powered by Leaflet bounded to Naic barangay coordinates with density heatmaps, birth-to-death demographic ratios, and temporal range filtering.
- **Enterprise Reporting & Export Suite**: Filtered extraction of civil issuances, registry documents, and service requests into CSV and Excel (`.xlsx`) formats.
- **Unified High-Aesthetic Pagination & Responsive Design**: Seamless responsiveness across desktop, tablet, and mobile screens with custom paginated data grids.

---

## Documentation Index

| Document | Path | Focus Area |
|---|---|---|
| **System Documentation** | `docs/SYSTEM_DOCUMENTATION.md` | Comprehensive architectural blueprints, components, directory breakdowns, and data flow |
| **Deployment Guide** | `docs/DEPLOYMENT_GUIDE.md` | Hybrid and local production installation, environment, and server setup |
| **Project Roadmap** | `docs/project_roadmap.md` | Development milestones, phase breakdown, deliverables, and project horizon |
| **Entity Relationship Diagram** | `docs/entity_relationship_diagram.md` | Relational Mermaid schema diagrams, keys, and model relations |
| **Database Schema & Flow** | `docs/database_schema_and_flow.md` | Detailed database fields, 20-table dictionary, migrations, and data lifecycles |

---

## Project Structure

```text
civicore_laravel/
|-- app/
|   |-- Console/Commands/       # Backup, prune, restore, maintenance CLI commands
|   |-- Http/
|   |   |-- Controllers/        # API and web controllers (Auth, Documents, Issuances, etc.)
|   |   |-- Middleware/         # Session auth (RequireSessionAuth), admin guards
|   |   `-- Requests/           # Form validation requests
|   |-- Models/                 # Eloquent entities (User, Document, Issuance, Ticket, etc.)
|   |-- Services/               # Core services (BackupService, OcrService, etc.)
|   `-- Support/                # EncryptedJson helpers, data transformers
|-- config/                     # Application, database, session, and backup configs
|-- database/
|   |-- migrations/             # Incremental database migrations
|   `-- seeders/                # Initial administrative and reference seeders
|-- docs/                       # Consolidated technical documentation and defense blueprints
|-- resources/
|   |-- js/                     # React 19 SPA frontend (Pages, Components, Modals)
|   |-- css/                    # Tailwind CSS definitions
|   `-- views/                  # Blade entry templates
|-- routes/
|   |-- api.php                 # RESTful API endpoints and protected route groups
|   |-- web.php                 # Web entry routes
|   `-- console.php             # Scheduled cron definitions (daily/weekly/monthly backups)
|-- tests/
|   |-- Feature/                # End-to-end and API integration tests
|   `-- Unit/                   # Unit test suite
|-- ocr_server.py               # Python FastAPI vision and OCR processing daemon
|-- start-civicore.bat          # Master orchestration launcher for all subsystems
`-- stop-civicore.bat           # Graceful system shutdown script
```

---

## System Requirements

| Component | Minimum Specification | Recommended |
|---|---|---|
| **Operating System** | Windows 10 / 11 (64-bit), Ubuntu 22.04 LTS | Windows 11 64-bit / Server 2022 |
| **PHP Runtime** | PHP 8.2+ (`pdo_mysql`, `zip`, `gd`, `fileinfo`, `mbstring`, `curl`) | PHP 8.3 |
| **Python Runtime** | Python 3.10+ (Tested on Python 3.13) | Python 3.12 / 3.13 |
| **Node.js** | Node.js 18.x or 20.x | Node.js 20.x LTS |
| **Package Managers** | Composer 2.5+, npm 9.x+, pip | Composer 2.7+, npm 10.x+, pip |
| **Database Engine** | MySQL 8.0+ or MariaDB 10.4+ | MySQL 8.0 / MariaDB 10.11 |
| **AI OCR Engine (Cloud)** | Google Gemini API Key (`gemini-2.5-flash`) | Gemini Pro / Flash API Key |
| **AI OCR Engine (Local/Offline)** | **Ollama v0.3.0+** with `qwen2.5vl:3b` | Ollama with CUDA GPU Acceleration |
| **Local Dev Suite** | Laragon Full, XAMPP, or Native Services | **Laragon Full** |

### Local Ollama Hardware Specifications

| Resource | Minimum (CPU-Only Mode) | Recommended (GPU-Accelerated) |
|---|---|---|
| **Processor (CPU)** | 4-Core x86_64 CPU (Intel i5 / AMD Ryzen 5) | 6+ Core CPU (Intel i7 / AMD Ryzen 7) |
| **System Memory (RAM)** | 8 GB System RAM | 16 GB+ System RAM |
| **Graphics Card (GPU)** | Not required (executes on CPU) | NVIDIA GPU with 4GB+ VRAM (GTX 1650, RTX 3050+) with CUDA |
| **Disk Storage** | 5 GB free disk space (model weights ~1.9GB) | NVMe SSD storage |
| **Ollama Service Port** | Port `11434` (`http://127.0.0.1:11434`) | Port `11434` (`http://127.0.0.1:11434`) |
| **OCR Python Port** | Port `8080` (`http://127.0.0.1:8080`) | Port `8080` (`http://127.0.0.1:8080`) |

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

# Install Python OCR Server dependencies
pip install -r requirements.txt
```

### 3. Local Ollama AI Setup (Offline Vision OCR)

CiviCORE includes an offline, privacy-first Vision OCR engine powered by **Ollama** and **Qwen2.5-VL (3B)** for on-premise document processing without cloud dependencies.

1. **Install Ollama**: Download for Windows from [ollama.com/download](https://ollama.com/download). (Linux: `curl -fsSL https://ollama.ai/install.sh | sh`).
2. **Download Vision Model**:
   ```bash
   ollama pull qwen2.5vl:3b
   ```
3. **Verify Service**: By default, Ollama listens on `http://127.0.0.1:11434`. When using `start-civicore.bat`, Ollama is detected and started automatically.
4. **Select Engine**: Navigate to **Accounts & System Administration** (`/accounts`) to switch between Google Gemini and Local Ollama with live health monitoring.

### 4. Environment Configuration
Copy the sample environment file and generate a secure application key:
```bash
cp .env.example .env
php artisan key:generate
```

Configure your `.env` parameters:
```env
APP_NAME=CiviCORE
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database Configuration (MySQL / MariaDB or SQLite)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=civicore_laravel
DB_USERNAME=root
DB_PASSWORD=

# Session Security & Drivers
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=null

# Backup Envelope Encryption Key (AES-256-GCM - Base64 32 bytes)
# Generate via: php -r "echo base64_encode(random_bytes(32));"
BACKUP_ENCRYPTION_KEY=

# Google Gemini AI OCR Engine Key & Model (Optional if using Local Ollama)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
# Optional: Multiple keys separated by commas for automated rotation & rate-limit prevention
# GEMINI_API_KEYS=key1,key2,key3

# Local Ollama URL (Default: http://127.0.0.1:11434)
OLLAMA_URL=http://127.0.0.1:11434

# Mail Configuration (Mailtrap for local dev / SMTP for production)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply@civicore.gov.ph"
MAIL_FROM_NAME="${APP_NAME}"

# Optional Dynamic Mail Providers
MAILTRAP_USERNAME=
MAILTRAP_PASSWORD=
GMAIL_USERNAME=
GMAIL_PASSWORD=

# Hybrid & Remote Access Configuration (Vercel, Tailscale, Cloudflare)
PUBLIC_PORTAL_URL=
CORS_ALLOWED_ORIGINS=https://localhost:5173,https://your-civicore.vercel.app,https://civicore-pc.tailscale.net
VITE_PUBLIC_PORTAL_ONLY=false
VITE_API_BASE_URL=
```

### 5. Database Setup & Migrations
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

### 6. Storage Symlink
Generate the public storage symlink for document scans, attachments, and generated QR code images:
```bash
php artisan storage:link
```

### 7. Build Frontend Assets
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

This concurrently launches all 5 core CiviCORE subsystems:
1. **Ollama Server**: Offline Vision AI service on `http://127.0.0.1:11434`.
2. **Laravel HTTP Server**: Core application gateway listening on `http://0.0.0.0:8000`.
3. **Unified Laravel Queue Worker**: Consolidated worker listening on prioritized queues `--queue=high,default,low` (`--tries=3 --sleep=1 --timeout=1200`):
   - `high`: Fast-path single-page scanner jobs and priority tasks.
   - `default`: Email notifications, OTP dispatches, and standard background operations.
   - `low`: Heavy multi-page batch OCR processing fan-out.
4. **Persistent OCR Server**: Python FastAPI vision processing daemon on `http://127.0.0.1:8080`.
5. **Vite Development Server**: Hot Module Replacement on port `5173`.

### Graceful System Shutdown (Windows)
To safely stop all background daemons without leaving orphan tasks:
- Press any key in the main `start-civicore.bat` control center window, **OR**
- Run the bundled `stop-civicore.bat` utility:
  ```cmd
  stop-civicore.bat
  ```
This cleanly terminates Ollama, the Python OCR service, queue workers, Laravel, and Vite.

Access the platform in your browser at:
**`http://localhost:8000`**

---

## System Architecture & Implemented Capabilities

### 1. Dual-Engine OCR Pipeline
- **Engines Supported**:
  - **Google Gemini Cloud AI (`gemini-2.5-flash`)**: High-speed cloud multimodal extraction with multi-key round-robin rotation (`GEMINI_API_KEYS`) and automatic fallback.
  - **Local Ollama Vision AI (`qwen2.5vl:3b`)**: 100% offline vision processing keeping sensitive civil records on municipal hardware.
- **Python Vision Bridge (`ocr_server.py`)**: Persistent FastAPI daemon handling dynamic resolution scaling (768px CPU Ollama, 1024px Gemini), structured JSON extraction, and OpenCV signature segmentation.
- **Diagnostics & Switching**: Live connectivity test via `/api/settings/ocr-status` and instant engine switching in `/accounts`.
- **Form Support**: Standardized extraction for LCR Form 102 (Live Birth), Form 103 (Death), and Form 101 (Marriage) across modern and legacy form variants.

### 2. Scanned Image Post-Processing Studio (`ImagePostFxModal.jsx`)
- **Lossless Rotation**: 90° step rotation to fix misoriented scans.
- **Binarization Filter**: High-contrast black-and-white thresholding for yellowed or carbon-copy archives.
- **Interactive 4-Corner Crop**: Draggable polygon handles isolating document borders via HTML5 Canvas.

### 3. Automated Backup & Disaster Recovery
- **Schedules (`routes/console.php`)**: Daily (2:00 AM, 7-day retention), Weekly (Sunday 3:00 AM, 4-week retention), Monthly (1st, 6-month retention), and Semi-Annual (Jan/Jul, 2-year retention). Auto-pruned at 6:00 AM.
- **AES-256-GCM Encryption (`BackupService.php`)**: Encrypted with `BACKUP_ENCRYPTION_KEY`, unique 12-byte IV, and authentication tag for tamper resistance.
- **Package Anatomy**: Compressed archive containing `database.sql` / `database.sqlite`, `files/*` (attachments), and `manifest.json`.
- **Point-in-Time Recovery**: Safety snapshot generated prior to restore. SuperAdmin `/backups` interface and interactive CLI utility (`civicore_backup_recovery.bat`).
- **System Restart Console**: SuperAdmin `/api/system/restart` endpoint flushes caches, restarts queue workers, resets OPcache, and records audit logs.

### 4. Account Security & Soft-Disable (Zero Data Loss)
- **Soft-Disable**: Indexed `is_active` flag preserves relational integrity, foreign keys, signatures, and audit trails.
- **Instant Session Revocation**: Disabling a user purges matching database sessions in real time.
- **Middleware Guard**: `RequireSessionAuth` rejects deactivated sessions with `403 Forbidden`. SuperAdmin accounts are protected from self-disablement.

### 5. Ticket Issuance Fulfillment Pipeline
- **Dedicated Counter Pipeline**: Citizen copy requests are recorded in `ticket_issuances`, isolating issued copies from official `documents` records.
- **Auditing & Undo**: Full tracking via `TicketIssuanceController` with soft-deletion, restoration (`undo`), and registrar report filtering.

### 6. Citizen QR Ticketing & Queue Management
- **Public Portal (`/request`)**: Contactless request submission generating unique QR code tickets tracked via `/ticket-status/{ticket_number}`.
- **Registrar Queue (`PendingRequests.jsx`)**: Progression states: `Pending` -> `Serving` -> `Completed` -> `Issued`.
- **Counter Scanner (`TicketScannerModal.jsx`)**: Webcam QR scanner for instant ticket lookup and document attachment.

### 7. Geospatial Demographic Analytics (`Mapping.jsx`)
- **Interactive Leaflet Map**: Geofenced to Naic barangays with density heatmaps, vital birth-to-death ratios, and jurisdiction leaderboards across customizable date ranges.

### 8. Custom Reporting & Export Suite (`Reports.jsx`)
- Multi-parameter filtering (dates, certificate types, statuses, barangays) with one-click export to **CSV** and **Excel (.xlsx)** formats.

### 9. Document Archive & Audit Logs (`ArchiveManager.jsx`)
- Soft-delete safeguards with restoration and permanent purge controls.
- Immutable audit log tracking timestamps, IP addresses, user roles, actions, and document IDs.

### 10. Data Standardization & Integrity
- **Recipient Naming**: Automatic uppercase formatting (`LASTNAME, FIRSTNAME MIDDLENAME SUFFIX` or joint marriage format).
- **Date Normalization**: Timezone-safe parser standardizing inputs into ISO `YYYY-MM-DD`.
- **Pagination**: Standardized `Pagination.jsx` component across all data grids.

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
| `php artisan queue:work --queue=high,default,low` | Starts processing asynchronous OCR, email dispatches, and notification queues. |
| `php artisan test` | Executes the PHPUnit / Pest automated test suite. |

---

## API Reference & Core Endpoints

### Public Endpoints
- `GET /api/public/config` - Public municipal configurations and portal settings
- `GET /api/public/stats` - Public counter statistics
- `GET /api/announcements` - Active municipal portal announcements
- `GET /api/templates` - Civil registry document templates
- `POST /api/public/tickets` - Citizen request submission (rate limited: 10 req/min)
- `GET /api/public/tickets/{token}` - Status verification for citizen ticket token
- `POST /api/v1/tickets/scan` - Staff counter QR code ticket check-in

### Staff & Ticket Operations (`/v1/tickets/*`)
- `GET /api/v1/tickets` - List citizen request tickets
- `GET /api/v1/staff/tickets/digital-stats` - Digital queue volume and throughput metrics
- `POST /api/v1/tickets/walk-in` - Record walk-in counter applicant
- `PATCH /api/v1/tickets/{id}/attach` - Link scanned civil registry document to ticket
- `PATCH /api/v1/tickets/{id}/cancel` - Cancel pending ticket
- `POST /api/v1/tickets/{id}/issue` - Complete fulfillment and issue official certificate
- `GET /api/v1/tickets/{id}/consent-form` - Retrieve signed citizen data privacy consent

### Ticket Issuances (`/api/ticket-issuances`)
- `GET /api/ticket-issuances` - Paginated counter fulfillment records (filterable by type, dates, query)
- `DELETE /api/ticket-issuances/{id}` - Soft-delete fulfilled ticket issuance
- `POST /api/ticket-issuances/{id}/undo` - Restore soft-deleted ticket issuance

### System Administration & OCR Diagnostics
- `GET /api/settings/ocr-status` - Check Ollama/Gemini connectivity, models, and API key counts (Admin/SuperAdmin)
- `POST /api/system/restart` - Clear application caches, restart workers, and reset OPcache (SuperAdmin)

---

## Automated Testing Suite

CiviCORE includes unit and feature test coverage verifying data security, document extraction, issuance workflows, and RBAC enforcement.

### Test Structure
- `tests/Feature/RbacSecurityTest.php`: Role-based route authorization and deactivated account access denial
- `tests/Feature/DocumentOcrNameExtractionTest.php`: Regex name parsing and structured OCR data validation
- `tests/Feature/DocumentValidationTest.php`: Field constraints, formatting rules, and duplicate detection
- `tests/Feature/ManualRegistrationDuplicateTest.php`: Duplicate registry number prevention
- `tests/Feature/PrintApprovalTest.php`: Multi-step issuance print request, approval, and rejection
- `tests/Feature/DocumentArchiveTest.php`: Soft-deletion, purge safeguards, and restoration
- `tests/Feature/DashboardStatsTest.php`: Demographic and monthly count aggregation
- `tests/Feature/CertificatePdfTest.php`: Certificate layout and PDF streaming

### Running Tests
Execute the entire test suite:
```bash
php artisan test
```

Run a specific test suite or test filter:
```bash
# Run RBAC security test
php artisan test tests/Feature/RbacSecurityTest.php

# Filter by test name
php artisan test --filter=DocumentValidationTest
```

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
| **1a** | Dual-Engine AI OCR Document Extraction | **Completed** | Camera overlay search & file upload scanning powered by Google Gemini AI (`gemini-2.5-flash`) and Local Ollama (`qwen2.5vl:3b`) for offline privacy. |
| **1b** | Image Post-Processing Studio | **Completed** | In-browser 90° rotation, B&W binarization filter, and 4-corner crop adjustment modal. |
| **1c** | Geospatial Analytics | **Completed** | Leaflet map with Naic geofencing, heatmaps, birth-to-death ratios, and leaderboard rankings. |
| **1d** | Role-Based Access Control & Safe Accounts | **Completed** | Soft-disable user workflow (`is_active`), instant session invalidation, and role middleware. |
| **1e** | Issuance Approval Workflow | **Completed** | Official Receipt (OR) generation, issuance approval queue, and print authorization. |
| **1f** | Centralized Document Archive | **Completed** | Soft-delete, document restoration, permanent purge, and comprehensive audit trail logging. |
| **1g** | Citizen QR Code Ticketing System | **Completed** | Public request form, unique QR generation, `/ticket-status/{ticket_number}`, and counter scanner. |
| **1h** | Multi-Format Export Suite (`/reports`) | **Completed** | Custom CSV and Excel (`.xlsx`) export module with granular multi-parameter filtering. |
| **1i** | Backup & Disaster Recovery Architecture | **Completed** | Multi-schedule automated backups, auto-pruning, pre-restore snapshots, and recovery CLI. |
| **1j** | High-Aesthetic Responsive Pagination | **Completed** | Reusable `Pagination.jsx` component adopted across all primary data tables. |
| **1k** | System Engine Reboot & Cache Purge | **Completed** | SuperAdmin on-demand system reboot console in Backup & Recovery (`/backups`) and `/api/system/restart` to flush framework caches, reset queue workers, flush OPcache, and purge client session memory. |
| **1l** | Registry Data Pipeline Integrity | **Completed** | Scoped Export Reports and Geospatial Mapping strictly to verified Registry Database documents (`Processed`, `Issued`, `Active`), eliminating raw draft upload leakage. |
| **1m** | Ticket Issuance Fulfillment Pipeline | **Completed** | Dedicated `ticket_issuances` pipeline separating citizen copy requests from permanent civil registry database archives. |

---

## Future Roadmap

The following enhancements are staged for future releases:
- **Export Reports Secondary Statistics Bar Simplification / Removal**: Re-evaluating or removing the secondary vital indicators bar (`Gender Ratio`, `Barangays Covered`, `Timely Filings`, `Special Vital: Seniors • Weddings`) on the Export Reports page pending municipal registrar workflow requirements and final reporting guidelines.


---

## License

Developed by **Team CiviCORE**. Released under the [MIT License](https://opensource.org/licenses/MIT).
