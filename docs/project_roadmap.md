# CiviCORE Project Roadmap

If the panel asks about the timeline and how you built the system from start to finish, you can use this roadmap. It shows a logical, structured approach to software engineering (which panelists look for!).

---

## Phase 1: Planning & Architecture Design
*   **Requirement Gathering:** Identified the primary pain points in the local civil registry (slow manual data entry, prone to human error, disorganized physical archives).
*   **Technology Stack Selection:** Chose **Laravel** for a robust backend and security, **React** for a fast Single Page Application (SPA) experience, and **Python/Gemini** for the AI extraction.
*   **Database Design:** Created the initial schema focusing on separation of concerns (separating raw uploaded `documents` from the final `issuances` master registry).

## Phase 2: Core Development (The Foundation)
*   **Authentication & Security:** Built the login system using Laravel's secure session cookies and Bcrypt password hashing. Implemented Role-Based Access Control (RBAC) for Admins and Staff.
*   **Frontend SPA:** Set up the React interface, including the global `DataContext` and routing layout so the page doesn't have to reload.
*   **Manual Data Entry:** Created the basic forms (`BirthForm`, `MarriageForm`, `DeathForm`) so staff could manually input data before the AI was introduced.

## Phase 3: AI OCR Integration (The Brain)
*   **Python Server:** Built the local `ocr_server.py` to handle heavy image processing (splitting PDFs, converting to grayscale, resampling) without crashing the Laravel backend.
*   **Gemini AI Connection:** Engineered the prompt instructions sent to the Google Gemini API to extract data into strict JSON format.
*   **Fuzzy Logic Mapping:** Developed `Mapping.jsx` using the Levenshtein distance algorithm to catch AI misspellings of Barangays and automatically snap them to valid database entries.
*   **The UI Overhaul:** Built the massive `OcrFormPanel` so staff could verify the AI's work side-by-side with the scanned image.

## Phase 4: Public Portal & Ticketing (The Expansion)
*   **Online Requests:** Built the public-facing React portal where citizens can request documents without coming to the office.
*   **QR Code & Queue System:** Implemented QR code generation using `SimpleSoftwareIO/QrCode` and built the Kiosk check-in system.
*   **Real-time Lobby:** Created the `LobbyQueue.jsx` dashboard to show queue numbers (starting at 101 daily) and sync online tickets with physical `issuances`.

## Phase 5: Polish, Security & Deployment (The Final Stretch)
*   **Bug Squashing:** Fixed critical bugs like "double-saving" by adding transaction locks and overlaying `ActionConfirmModal.jsx` using React Portals.
*   **Optimization:** Added Laravel caching (`cache_locks`) and background queued jobs (`ProcessDocumentOcr.php`) so the UI remains fast even when processing heavy images.
*   **Final Defense Prep:** Documented the architecture, data flow, DFDs, and ERDs for the final panel presentation.
