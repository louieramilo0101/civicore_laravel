# CiviCORE - Civic Document Management System

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.0-red?style=for-the-badge&logo=laravel" alt="Laravel Version">
  <img src="https://img.shields.io/badge/PHP-8.2-purple?style=for-the-badge&logo=php" alt="PHP Version">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React Version">
  <img src="https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind Version">
</p>

## About CiviCORE
CiviCORE is a premium, web-based civic document management system designed for Local Government Units (LGUs). It streamlines the process of digitizing, managing, and issuing vital records like Birth, Marriage, and Death certificates.

---

## 🌟 Key Updates (v1.1)
- **📊 Live Analytics**: Dashboard charts (Line, Bar, Doughnut, Radar) are now fully connected to the MySQL database, providing real-time 6-month upload trends and OCR accuracy metrics.
- **🏛️ Premium Branding**: Enhanced sidebar UI with professional logo containers, glassmorphism effects, and optimized typography.
- **⚡ Gradual Loading**: Implemented targeted skeleton loaders and frontend caching (`sessionStorage`) for a lightning-fast perceived performance.
- **🛠️ Refined UX**: Added password visibility toggles, professional delete confirmation dialogs, and standardized interactive states.

---

## 🚀 Features

### ✅ Core Functionalities
- **Secure Authentication**: Session-based login with password visibility toggle and optimized response times.
- **Dynamic Dashboard**: Real-time stats cards and interactive Chart.js visualizations.
- **Advanced Document Management**: Upload support for PDF and images with immediate layout rendering and background data fetching.
- **Certificate Issuance**: Automated certificate numbering with full CRUD support and delete confirmation.
- **Mapping System**: Interactive barangay-level pinning for data visualization.
- **Account Control**: Role-based user management with profile customization.

---

## 🛠 Tech Stack
- **Backend**: Laravel 12.x (PHP 8.2+)
- **Frontend**: React 18, Vite, Framer Motion (for smooth animations)
- **Styling**: Tailwind CSS
- **Database**: MySQL 8.x
- **OCR Engine**: EasyOCR (Python Integration)

---

## 📥 Installation Guide

Follow these steps to set up the project on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- **PHP 8.2+** & **Composer**
- **Node.js 18+** & **npm**
- **MySQL 8.x** (If using Laragon, ensure the port is correct, usually `3306` or `3307`)
- **Python 3.x** (Optional, for OCR features: `pip install easyocr`)

### 2. Clone the Repository
```bash
git clone https://github.com/louieramilo0101/civicorelaravel2.git
cd civicorelaravel2
```

### 3. Install Dependencies
```bash
# Install PHP dependencies
composer install

# Install JS dependencies
npm install
```

### 4. Environment Configuration
```bash
cp .env.example .env
```
Open `.env` and configure your database settings:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307 # Update based on your MySQL config
DB_DATABASE=civicore_laravel
DB_USERNAME=root
DB_PASSWORD=
```

### 5. Application Setup
```bash
# Generate application key
php artisan key:generate

# Link storage
php artisan storage:link

# Run migrations and seed sample data
php artisan migrate --seed
```
*Note: The seeder will populate the database with 300+ sample records for realistic dashboard visualization.*

### 6. Run the Application
You will need two terminal windows open:

**Terminal 1: Vite (Frontend)**
```bash
npm run dev
```

**Terminal 2: Laravel (Backend)**
```bash
php artisan serve
```
Access the application at `http://localhost:8000`.

---

## 📂 Project Structure
- `app/Http/Controllers`: Backend logic and API endpoints.
- `resources/js/components`: React UI components.
- `database/migrations`: SQL schema definitions.
- `database/seeders`: Sample data for testing.
- `ocr_processor.py`: Python script for text extraction.

---

## 🤝 Support & Contribution
For issues and feature requests, please create an issue in the [GitHub Repository](https://github.com/louieramilo0101/civicorelaravel2).

## License
Licensed under the [MIT license](https://opensource.org/licenses/MIT).
