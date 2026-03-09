# Civicore - Civic Document Management System

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.0-red?style=for-the-badge&logo=laravel" alt="Laravel Version">
  <img src="https://img.shields.io/badge/PHP-8.2-purple?style=for-the-badge&logo=php" alt="PHP Version">
  <img src="https://img.shields.io/badge-License-MIT-green?style=for-the-badge" alt="License">
</p>

## About Civicore

Civicore is a web-based civic document management system designed for local government units (LGUs), specifically barangays. It facilitates the creation, management, and issuance of civic documents such as birth certificates, death certificates, marriage certificates, and other official issuances.

## Features

### Core Features
- **User Authentication** - Secure login/logout with session management
- **User Management** - Create, update, and manage user accounts
- **Document Management** - Upload and manage civic documents
- **OCR Processing** - Extract text from documents using EasyOCR
- **Certificate Issuance** - Generate and manage official certificates
- **Barangay Management** - Manage barangay information and data
- **Template System** - Customizable document templates

### Technical Features
- RESTful API architecture
- EasyOCR integration for document text extraction
- File upload support (PDF, JPG, PNG)
- Input validation
- CORS support for cross-origin requests

## Tech Stack

- **Backend:** Laravel 12.x (PHP 8.2+)
- **Database:** MySQL (civicore_db)
- **OCR Engine:** EasyOCR (Python)
- **Frontend:** Vanilla JavaScript (in progress - React migration planned)
- **Server:** Built-in PHP development server

## Prerequisites

- PHP 8.2 or higher
- Composer
- MySQL 5.7 or higher
- Node.js & npm (for asset compilation)
- Python 3.x (for OCR processing)
- EasyOCR: `pip install easyocr`

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd civicore_laravel
```

### 2. Install Dependencies
```bash
composer install
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

### 4. Update .env File
Edit the `.env` file with your database credentials:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=civicore_db
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 5. Generate Application Key
```bash
php artisan key:generate
```

### 6. Run Migrations
```bash
php artisan migrate
```

### 7. Start Development Server
```bash
php artisan serve
```

The application will be available at `http://localhost:8000`

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
├── routes/
│   ├── api.php              # API routes
│   └── web.php              # Web routes
├── resources/
│   ├── views/               # Blade templates
│   └── css/                 # Stylesheets
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

## Development Roadmap

See [TODO.md](./TODO.md) for the complete development roadmap including:
- Current tasks and improvements
- Long-term goals (React migration, Inertia.js integration)
- Completed features

## License

The Civicore project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## Support

For issues and feature requests, please create an issue in the project repository.

## Credits

- Built with [Laravel](https://laravel.com)
- OCR powered by [EasyOCR](https://github.com/JaidedAI/EasyOCR)

