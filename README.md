# Civicore - Civic Document Management System

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.0-red?style=for-the-badge&logo=laravel" alt="Laravel Version">
  <img src="https://img.shields.io/badge/PHP-8.2-purple?style=for-the-badge&logo=php" alt="PHP Version">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

## About Civicore

Civicore is a web-based civic document management system designed for local government units (LGUs), specifically barangays. It facilitates the creation, management, and issuance of civic documents such as birth certificates, death certificates, marriage certificates, and other official issuances.

---

## 🚀 Features

### ✅ Completed Features

#### Core Features
- **User Authentication** - Secure login/logout with session management
  - Optimized login response time (reduced from 3-4 seconds to near instant)
  - Loading spinner UI during authentication
  - Session persistence with auto-refresh
  - Password change and verification functionality
- **User Management** - Create, update, and manage user accounts
  - CRUD operations for user accounts
  - Profile management
  - Permission-based access control
- **Document Management** - Upload and manage civic documents
  - Support for PDF, JPG, PNG file uploads
  - Document categorization and storage
- **OCR Processing** - Extract text from documents using EasyOCR
  - Python-based OCR engine integration
  - Text extraction from uploaded images and PDFs
- **Certificate Issuance** - Generate and manage official certificates
  - Automatic certificate numbering
  - Multiple certificate types (birth, death, marriage, etc.)
  - Issuance tracking and management
- **Barangay Management** - Manage barangay information and data
  - Barangay information storage
  - Integration with document templates
- **Template System** - Customizable document templates
  - Dynamic template rendering
  - Easy template updates

#### Technical Features
- RESTful API architecture
- EasyOCR integration for document text extraction
- File upload support (PDF, JPG, PNG)
- Input validation with Laravel validators
- CORS support for cross-origin requests
- Session-based authentication
- React frontend components with Vite

---

## 📊 Project Progress

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | ✅ Complete | Optimized for fast response |
| User Management | ✅ Complete | Full CRUD operations |
| Document Upload | ✅ Complete | PDF, JPG, PNG support |
| OCR Processing | ✅ Complete | EasyOCR integration |
| Certificate Issuance | ✅ Complete | Auto-numbering system |
| Barangay Management | ✅ Complete | Data management |
| Template System | ✅ Complete | Dynamic templates |
| LoadingSpinner Component | ✅ Complete | Modern loading UI |
| AnimatedCounter Component | ✅ Complete | Animated number display |
| Dashboard Component | ✅ Complete | Main dashboard view |
| Documents Component | ✅ Complete | Document management UI |
| Issuances Component | ✅ Complete | Certificate issuance UI |
| Layout Component | ✅ Complete | Application layout wrapper |
| PageTransition Component | ✅ Complete | Smooth page transitions |
| SkeletonLoader Component | ✅ Complete | Loading skeleton UI |
| Templates Component | ✅ Complete | Template management UI |
| Users Component | ✅ Complete | User management UI |
| Barangays Component | ✅ Complete | Barangay data display UI |
| React Migration | 🔄 In Progress | Partial - 12 components added |
| Performance Optimization | ✅ Complete | Login delay fix applied |

---

## 🛠 Tech Stack

- **Backend:** Laravel 12.x (PHP 8.2+)
- **Database:** MySQL (civicore_db)
- **OCR Engine:** EasyOCR (Python)
- **Frontend:** React 18 with Vite (hybrid with Vanilla JS)
- **Frontend Components:** React 18 (12 components: AnimatedCounter, Dashboard, Documents, Issuances, Layout, LoadingSpinner, Login, PageTransition, SkeletonLoader, Templates, Users, Barangays)
- **Server:** Built-in PHP development server

## Prerequisites

**Server Environment (Laragon Recommended):**
- PHP 8.2+
- Composer
- Node.js 18+ & npm
- MySQL 8+ (Laragon default port: **3307**)
- Python 3.x + `pip install easyocr` (for OCR)

## Installation (Complete Setup - Tested on Laragon)

### 1. Clone & Install Dependencies (Clear Cache for Fresh Install)
```bash
git clone <repository-url>
cd civicore_laravel
composer install --no-cache --optimize-autoloader
npm ci
```

### 2. Copy & Configure .env
```bash
copy .env.example .env
```
**Edit `.env` (Critical for Laragon):**
```
APP_NAME=Civicore
APP_ENV=local
APP_KEY=  # Will be generated in step 3
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307  # Laragon MySQL port (check Laragon tray icon)
DB_DATABASE=civicore_db
DB_USERNAME=root
DB_PASSWORD=  # Usually empty in Laragon
```

### 3. Generate APP_KEY (Required - Fixes Encryption Errors)
```bash
php artisan key:generate
```

### 4. Setup Database (IMPORT DATA - Don't Migrate!)
- Open **phpMyAdmin/HeidiSQL** (Laragon → MySQL → phpMyAdmin)
- Create database `civicore_db` (utf8mb4_unicode_ci)
- Import `civicore-export.sql` (includes users: admin@civicore.com)
```
**Default Login:** admin@civicore.com / Check `check_bcrypt_cost.php` or reset password
```

### 5. Storage & Permissions (Fixes 500 Errors)
```bash
php artisan storage:link
# Windows/Laragon:
icacls storage /grant "Everyone":F /T
icacls bootstrap\cache /grant "Everyone":F /T
```

### 6. Cache & Assets
```bash
php artisan config:cache
php artisan route:cache
npm run dev  # or npm run build for production
```

### 7. Start Server
```bash
php artisan serve
```
**Access:** http://localhost:8000

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| **"No application encryption key generated"** | `php artisan key:generate` |
| **DB Connection Failed** | Check DB_PORT=3307 (Laragon), create `civicore_db`, import SQL dump |
| **500 Internal Server Error** | `php artisan storage:link`, fix storage perms, check `storage/logs/laravel.log` |
| **Login Fails** | Import civicore-export.sql has users; run `check_user.php` for passwords |
| **npm/yarn issues** | `rm -rf node_modules package-lock.json && npm ci` |
| **Composer slow** | `composer install --no-cache` |
| **Slow login** | Already optimized; clear cache: `php artisan cache:clear` |

**Logs:** `tail -f storage/logs/laravel.log` during startup.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/session` | Get current session |
| POST | `/api/change-password` | Change user password |
| POST | `/api/verify-password` | Verify user password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user by ID |
| POST | `/api/users` | Create new user |
| POST | `/api/create-account` | Create new account |
| PUT | `/api/users/{id}` | Update user |
| PUT | `/api/users/{id}/profile` | Update user profile |
| DELETE | `/api/users/{id}` | Delete user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create document |
| POST | `/api/documents/upload` | Upload document file |
| DELETE | `/api/documents/{id}` | Delete document |

### OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr/process` | Process document with EasyOCR |

### Issuances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issuances` | List all issuances |
| GET | `/api/issuances/{id}` | Get issuance by ID |
| POST | `/api/issuances` | Create new issuance |
| DELETE | `/api/issuances/{id}` | Delete issuance |
| GET | `/api/issuances/next-cert-number/{type}` | Get next certificate number |

### Barangays
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/barangays` | List all barangays |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| PUT | `/api/templates/{type}` | Update template |

## Project Structure

```
civicore_laravel/
├── app/
│   ├── Http/
│   │   └── Controllers/     # API Controllers
│   │       ├── AuthController.php
│   │       ├── BarangayController.php
│   │       ├── DocumentController.php
│   │       ├── IssuanceController.php
│   │       ├── OcrController.php
│   │       ├── TemplateController.php
│   │       └── UserController.php
│   └── Models/              # Eloquent Models
├── config/                  # Configuration files
├── database/
│   └── migrations/          # Database migrations
├── public/
│   ├── index.html           # Frontend application
│   └── js/                  # JavaScript files
├── resources/
│   ├── js/
│   │   └── components/      # React components
│   │       ├── AnimatedCounter.jsx
│   │       ├── Barangays.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Documents.jsx
│   │       ├── Issuances.jsx
│   │       ├── Layout.jsx
│   │       ├── LoadingSpinner.jsx
│   │       ├── Login.jsx
│   │       ├── PageTransition.jsx
│   │       ├── SkeletonLoader.jsx
│   │       ├── Templates.jsx
│   │       └── Users.jsx
│   └── views/               # Blade templates
├── routes/
│   ├── api.php              # API routes
│   └── web.php              # Web routes
├── storage/                 # Storage directory
├── ocr_processor.py         # EasyOCR processing script
└── composer.json            # PHP dependencies
```

## OCR Processing

The application uses EasyOCR for extracting text from uploaded documents. The OCR processor is a Python script (`ocr_processor.py`) that can be executed from the server.

### Running OCR Separately
```bash
python ocr_processor.py
```

## Recent Updates

### Performance Optimization
- **Login Response Time Improvement**: Fixed the login delay issue that caused 3-4 second wait times on invalid login attempts
  - Optimized password verification logic
  - Added early return for invalid email
  - Reduced unnecessary processing steps
- **LoadingSpinner Component**: Added a reusable React loading spinner component for better UX during authentication and data loading

### GitHub Commit Information
- **Branch**: `blackboxai/performance-optimizations`
- **PR**: https://github.com/louieramilo0101/civicore_laravel/pull/1
- **Recent Commits**:
  - `c5bd503` Refactor OcrController to support database-stored files and add document ID-based processing
  - `6c14f71` Performance optimizations: session config, bcrypt cost, pagination, caching, indexes

### Development Roadmap

See [TODO.md](./TODO.md) for the complete development roadmap including:
- Current tasks and improvements
- Long-term goals (complete React migration, Inertia.js integration)
- Completed features

## License

The Civicore project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## Support

For issues and feature requests, please create an issue in the project repository.

## Credits

- Built with [Laravel](https://laravel.com)
- OCR powered by [EasyOCR](https://github.com/JaidedAI/EasyOCR)
- Frontend built with [React](https://reactjs.org)

