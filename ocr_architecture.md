# CiviCORE OCR Architecture & Technology Stack

This document breaks down the entire technology stack used in the CiviCORE application specifically for the Optical Character Recognition (OCR) pipeline. It covers the journey of a document from the user's browser, through the PHP/Laravel backend, into the Python background server, and back.

---

## 1. Frontend: The User Interface (React + Vite)
The frontend is responsible for providing a smooth, animated user experience for uploading and previewing documents.

**Core Technologies:**
*   **React 19 (`react`, `react-dom`)**: The foundational JavaScript library used to build the interactive user interface (components like the Document Viewer Modal and Upload screens).
*   **Vite (`vite`, `laravel-vite-plugin`)**: The lightning-fast build tool and development server that bundles the React code and connects it directly to Laravel.
*   **Tailwind CSS v4 (`tailwindcss`)**: The utility-first CSS framework used for styling the entire application (glassmorphism effects, layouts, responsive design).

**Key Libraries for OCR Flow:**
*   **`react-dropzone`**: A specialized React component used to create the drag-and-drop file upload areas. It handles file selection and initial validation in the browser before sending it to the server.
*   **`framer-motion`**: Used for the smooth micro-animations, transitions, and loading spinners while the user waits for the OCR to process.
*   **`axios`**: The HTTP client used by React to securely send the uploaded files via POST requests to the Laravel API.

---

## 2. Backend: The Application Logic & Queues (PHP + Laravel)
Laravel acts as the "Traffic Cop." It receives the file from React, saves it, and orchestrates the background processing so the user's browser doesn't freeze.

**Core Technologies:**
*   **PHP 8.2+**: The server-side programming language.
*   **Laravel 12 (`laravel/framework`)**: The robust PHP framework that handles routing, database connections, and business logic.

**Key Components for OCR Flow:**
*   **Laravel Queues (`Illuminate\Contracts\Queue\ShouldQueue`)**: Instead of processing the OCR instantly (which could take a long time), Laravel puts the task into a background queue. The `ProcessImageOcrJob.php` file handles this.
*   **`WithoutOverlapping` Middleware**: A lock system applied to the Queue Job. It forces the queue workers to process Gemini API requests one at a time (in a single-file line) to strictly obey the Google API rate limits (15 RPM).
*   **Laravel HTTP Client (`Illuminate\Support\Facades\Http`)**: Used inside the Queue Job to send the image from the Laravel PHP server over to the separate Python FastAPI server.
*   **`barryvdh/laravel-dompdf`**: A Laravel library used to take the extracted OCR data and generate a clean, downloadable PDF report.

---

## 3. The OCR Engine: Dual-Engine AI & Image Processing (Python + Ollama)
Because Python has the best ecosystem for Artificial Intelligence and Computer Vision, a dedicated, persistent Python server handles the heavy lifting of reading the documents. It coordinates two switchable AI engines based on system configuration:

**Core Server Framework:**
*   **FastAPI & Uvicorn**: A modern, high-performance web framework for building APIs in Python. It listens on `http://127.0.0.1:8080/ocr/gemini` and waits for Laravel queue workers to send image payloads.

**Dual AI Engines:**
1.  **Google Gemini Cloud AI (`gemini-2.5-flash`)**:
    *   Communicates via the official **Google GenAI SDK (`google-genai`)**.
    *   Features intelligent key rotation with automated cooldown backoff across multiple API keys (`GEMINI_API_KEYS`).
    *   Extracts complete civil registry forms in 2–4 seconds via cloud multimodal intelligence.
2.  **Local Ollama Vision AI (`qwen2.5vl:3b`)**:
    *   Communicates directly with the local **Ollama** service running on `http://127.0.0.1:11434/api/generate`.
    *   Processes document images **100% offline and on-premise** with zero external cloud transmission. Guarantees complete data privacy and compliance for sensitive municipal archives.
    *   Incurs zero recurring API fees or token costs.
    *   Supported by CPU inference (optimized at 768px resolution) and hardware GPU acceleration (NVIDIA CUDA).

**Image Processing & Post-Processing Libraries:**
*   **Pillow (`PIL`)**: The standard Python image library. It dynamically downscales images based on the target engine: **768px** for local CPU-bound Ollama processing to maximize RAM efficiency and inference speed, or **1024px** for Gemini Cloud.
*   **OpenCV (`cv2`) & NumPy (`numpy`)**: Advanced computer vision libraries. Used to target, crop, and binarize physical registrar signatures into clean transparent PNG stamps.
*   **PyMuPDF (`fitz`)**: Converts uploaded multi-page PDF documents into optimized image arrays before feeding into the OCR pipeline.

---

## Summary of the Data Flow
1. **React** (`react-dropzone`) captures the scanned document from the user and sends it via **Axios**.
2. **Laravel** receives the file, saves it to `storage/app/public/documents`, and dispatches a background **Queue Job** (`ProcessImageOcrJob` or `ProcessDocumentOcr`).
3. The Laravel **Queue Worker** checks the active engine in the database (`Setting::where('key', 'ocr_engine')` -> `gemini` or `ollama`) and issues an HTTP POST request to the Python FastAPI server (`http://127.0.0.1:8080/ocr/gemini`).
4. **FastAPI** (Python) receives the file path and engine parameters:
   - Resizes image to optimal bounds (768px for Ollama, 1024px for Gemini).
   - If **Gemini**: Dispatches multimodal prompt to Google Gemini API using active non-cooling key.
   - If **Ollama**: Base64-encodes the image and dispatches a JSON-formatted vision request to `http://127.0.0.1:11434/api/generate` running `qwen2.5vl:3b`.
5. Python extracts registrar signatures using **OpenCV** and saves transparent PNG cutouts.
6. Python parses the structured JSON output, validates required fields, and returns the payload to Laravel.
7. Laravel saves the structured civil registry records (and signature paths) to the MySQL database.
8. The React frontend updates in real-time and displays the digitized record!
