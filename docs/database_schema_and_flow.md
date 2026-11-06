# Database Schema & Flow (civicore_new)

The database used by the system is MySQL. The provided SQL dump (`civicore-export-5-29-2026.sql`) reveals a highly structured, relational database designed to handle raw OCR extractions, permanent civic registries, background processing, and public ticketing.

Below is a breakdown of the core tables, their purposes, and how data flows between them.

---

## 1. Database Overview (Total: 20 Tables)

The database consists of exactly **20 tables**. Here is a complete dictionary of every table and what it does in the system:

1. **`activity_logs`**: Tracks every action (create, update, delete, view) performed by a user for audit and security purposes.
2. **`announcements`**: Stores messages and notices that are displayed on the staff dashboard.
3. **`barangays`**: The master list of valid barangays, used by the frontend Fuzzy Logic to auto-correct AI spelling mistakes.
4. **`cache`**: A Laravel system table that temporarily stores frequent database queries to speed up the application.
5. **`cache_locks`**: Used alongside the cache to prevent "race conditions" (e.g., preventing two staff from editing the same record at the exact same millisecond).
6. **`documents`**: The "Staging Area" where newly uploaded scanned images and their raw, unverified AI extracted text are temporarily held.
7. **`document_history_logs`**: Keeps a history of status changes specifically for documents (e.g., Pending -> Processing -> Extracted).
8. **`document_ocr_pages`**: Stores page-by-page metadata if a multi-page PDF is scanned and split.
9. **`failed_jobs`**: Logs any background tasks (like OCR processing) that crashed or failed, allowing developers to debug the error.
10. **`issuances`**: The most important table. The "Master Registry" containing final, verified certificates ready for printing.
11. **`jobs`**: The queue table. When a heavy OCR task is triggered, it sits here until a background worker processes it, keeping the website fast.
12. **`job_batches`**: Groups multiple background jobs together so the system knows when a large batch of tasks is fully complete.
13. **`migrations`**: A Laravel framework table that tracks which structural changes have been applied to the database schema.
14. **`password_reset_tokens`**: Temporarily stores secure, encrypted tokens when a user clicks "Forgot Password".
15. **`sessions`**: Stores active user logins securely on the server side to protect against cross-site scripting (XSS) attacks.
16. **`settings`**: Stores global application configurations (like the maximum daily scan limit).
17. **`template_profiles`**: Stores coordinate mapping configurations for zonal OCR (if strict templates are used).
18. **`tickets`**: The public queue table. Stores online requests made by citizens via the public portal or kiosk.
19. **`users`**: Stores the system accounts (staff and admins) along with their Bcrypt-encrypted passwords and role permissions.
20. **`verification_codes`**: Stores OTPs (One Time Passwords) for multi-factor authentication or email verifications.

---

## 1. Core Data Flow (The "Lifecycle" of a Record)

To explain the database to the panel, you should describe the "Lifecycle" of a document as it moves through these three main tables:

1.  **`documents` (The Sandbox/Staging Area)**
    *   **What it is:** When a staff member uploads a scanned PDF/image, it is inserted here first.
    *   **Fields:** It contains `file_path`, `ocr_text` (raw AI output), `extracted_fields` (JSON from Gemini), and a `status` column (`pending`, `checking`, `extracted`, `Processed`).
    *   **Purpose:** It acts as a temporary holding area. Data here isn't considered "official" yet until human verification happens.

2.  **`issuances` (The Master Registry / Final Truth)**
    *   **What it is:** This is the most important table in the system. Once a staff member verifies the OCR data from the `documents` table and clicks "Save", a permanent record is created here.
    *   **Fields:** It holds the clean, finalized data: `certNumber` (e.g., `BC-2026-001`), `name`, `type` (birth, death, marriage), `barangay`, and `extracted_data` (the final, verified JSON).
    *   **Connection:** It contains a `document_id` foreign key that points back to the original uploaded scan in the `documents` table for auditing.

3.  **`tickets` (The Public Request Queue)**
    *   **What it is:** When a citizen requests a document online or at a kiosk, their request goes here.
    *   **Fields:** It stores `ticket_number` (e.g., `T-2026-0001`), `qr_code_token`, `client_name`, `request_status`, and `queue_status` (e.g., `waiting`, `serving`).
    *   **Connection:** When staff process a ticket, they attach it to an official record. The system takes the `document_id`, merges the citizen's form input with the OCR data, and links the `ticket_number` to the `issuances` table.

---

## 2. Supporting Tables & Infrastructure

### Security & Authentication
*   **`users`**: Stores staff and admin accounts. Passwords here are securely encrypted using Laravel's `Bcrypt` algorithm. Includes roles (e.g., `Admin`, `SuperAdmin`) to restrict access.
*   **`sessions`**: Stores active login sessions. We use server-side sessions instead of JWTs to protect against XSS (Cross-Site Scripting) attacks.
*   **`password_reset_tokens` & `verification_codes`**: Handles secure password resets and multi-factor/email verification securely.
*   **`activity_logs`**: Crucial for system audits. It records every action (Viewed, Created, Updated, Deleted) performed by a user, including what `record_id` they touched.

### AI & Background Processing
*   **`jobs`, `job_batches`, `failed_jobs`**: Because OCR and Python processing take time (sometimes 5-10 seconds per page), we cannot make the user's browser wait. Laravel pushes the OCR task into the `jobs` table. A background worker picks it up, talks to the Python server, and updates the `documents` table when finished.
*   **`document_ocr_pages`**: Stores page-by-page metadata if a large, multi-page PDF is scanned.
*   **`template_profiles`**: Stores coordinates and configurations for specific document templates (if utilizing zonal OCR).

### System Data
*   **`barangays`**: The master list of valid barangays. When Gemini extracts a misspelled barangay (e.g., "Bgy San Jse"), the React frontend (`Mapping.jsx`) uses Fuzzy Logic to compare it against this table and correct it to the exact string.
*   **`settings`**: Stores global system configurations.
*   **`announcements`**: Stores the announcements displayed on the staff dashboard.
*   **`cache`, `cache_locks`**: Used by Laravel to speed up repetitive database queries and ensure smooth performance during heavy loads.
*   **`migrations`**: A Laravel-specific table that tracks which database structural changes have already been applied.

---

## 3. How they Connect (Relational Summary)

If asked about table relationships (Foreign Keys), here is the breakdown:

*   `issuances.document_id` -> `documents.id` *(1-to-1: Every issuance comes from one verified document).*
*   `tickets.document_id` -> `documents.id` *(1-to-1: A ticket can be linked to a document for printing).*
*   `activity_logs.user_name` -> Tracks back to `users.name` *(Audit trailing).*

**Why JSON columns?**
Notice that `documents.extracted_fields` and `issuances.extracted_data` are JSON columns. This is a deliberate NoSQL-like design choice within MySQL. Because Birth, Death, and Marriage certificates have wildly different fields (e.g., Marriage has Husband/Wife, Birth has Mother/Father), storing them in a flexible JSON column prevents our table from having 100+ empty columns, making the database extremely fast and scalable.

---

# Database Directory (`database/`) Overview

The `database` folder holds all the scripts and tools needed to construct and fill your MySQL database. Instead of manually creating tables using phpMyAdmin, you write code in here to generate the database structure. This is crucial for version control and working in teams.

Here is the file-by-file and folder-by-folder breakdown:

---

## 1. `database/migrations/`
Migrations are like "version control" for your database. They contain PHP scripts that tell the database exactly what tables to create, what columns they should have, and what data types to use (e.g., `VARCHAR`, `INT`, `LONGTEXT`). 

If you look at the filenames, they are prefixed with a timestamp (e.g., `2026_03_24_000001_create_documents_table.php`). This ensures they run in the exact order they were created.

*   **`0001_01_01_000000_create_users_table.php`**: Creates the `users` table for staff accounts, passwords, and roles.
*   **`0001_01_01_000001_create_cache_table.php`**: Creates tables for the framework to store cache data.
*   **`0001_01_01_000002_create_jobs_table.php`**: Creates the `jobs` and `failed_jobs` tables used for background processing (like OCR extraction).
*   **`2024_01_15_000001_add_performance_indexes.php`**: Adds database indexes to speed up search queries across massive datasets.
*   **`2026_03_24_000001_create_documents_table.php`**: Creates the `documents` table which archives scanned files.
*   **`2026_03_24_000002_create_issuances_table.php`**: Creates the core `issuances` table for Birth, Marriage, and Death certificates.
*   **`2026_03_24_000003_create_barangays_table.php`**: Creates the `barangays` dictionary table for standardized dropdowns.
*   **`2026_04_08_014000_create_activity_logs_table.php`**: Creates the `activity_logs` table to track who did what.
*   **`2026_04_09_000001_create_document_history_logs_table.php`**: Tracks changes specifically made to archived documents.
*   **`2026_04_21_060039_create_settings_table.php`**: Creates a table for dynamic system configurations (System Name, Logo path).
*   **`2026_04_21_061006_create_announcements_table.php`**: Creates the table for dashboard bulletin messages.
*   **`2026_04_21_065817_create_verification_codes_table.php`**: Temporarily stores 6-digit OTP codes for email verification.
*   **`2026_04_27_000001_create_document_ocr_pages_table.php`**: Stores text extracted from massive multi-page documents, mapped page-by-page.
*   **`2026_04_27_092700_create_template_profiles_table.php`**: Stores X,Y mapping coordinates for printing on blank certificates.
*   **`2026_05_26_000001_create_tickets_table.php`**: Creates the `tickets` table for the public-facing document request queue.
*   **`2026_05_26_101717_add_print_approval_fields...`**: Alters the `issuances` table to add fields like `or_number` and `requested_by` for the print approval workflow.
*   **`2026_05_27_230000_add_certificate_type_to_issuances.php`**: Modifies issuances to differentiate between birth, death, and marriage.
*   **`2026_05_28_000001_add_qr_fields_to_tickets_table.php`**: Modifies the `tickets` table to store secure tracking codes and QR code paths.
*   **`2026_05_28_104539_add_ticket_number_to_issuances_table.php`**: Links a queue ticket to a final registry issuance.
*   **`2026_05_28_110000_change_extracted_data_to_longtext...`**: A critical fix made recently to prevent database crashes when saving heavy base64 image data from the OCR frontend.
*   **`2026_05_28_192000_update_tickets_table_v2.php`**: The most recent update refining the ticketing system structure.

*   **Why Migrations are important:** If a panelist asks, "How do you deploy this to a new server?", you explain that you don't copy the database manually. You just run `php artisan migrate`, and Laravel reads these files to build the entire database structure in seconds.

---

## 2. `database/seeders/`
Seeders are scripts that populate your database with initial "dummy" or "default" data. 
*   **`DatabaseSeeder.php`** (and related files inside this folder):
    *   **What it does:** Typically inserts the default Super Admin account so you can actually log in the first time you deploy. It is also used to insert the default list of Barangays (`barangays_table`), and default settings (`settings_table`).
    *   **Why it's important:** Prevents you from having to manually type in default records every time you reset the database.

---

## 3. `database/factories/`
Factories are blueprints for generating fake testing data.
*   **What they do:** Define what a fake "User" or fake "Issuance" looks like (e.g., generating a random name using a Faker library).
*   **Why it's important:** If you need to test how the dashboard looks with 1,000 records, you can use factories to instantly generate 1,000 fake records instead of typing them one by one.

---

## 4. `database/database.sqlite`
*   **What it is:** This is a local, file-based SQLite database. 
*   **Why it's here:** Depending on your `.env` configuration, Laravel might use this file for running automated tests rapidly without touching your main MySQL database.
