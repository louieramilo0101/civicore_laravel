# CiviCORE Hybrid Deployment Guide (Vercel + Local System)

This guide documents how CiviCORE is deployed with **Landing Page & Ticketing on Vercel** and the **Back-Office Operations locally on Laragon**.

Both **Plan A (Default)** and **Plan B (Cloud DB Fallback)** are fully pre-wired in the codebase. Switching between them requires **zero code modifications**—only setting environment variables.

---

## Architecture Summary

| Layer | Environment | Purpose |
|---|---|---|
| **Public Portal** | **Vercel** (`https://your-civicore.vercel.app`) | Landing page, municipal services, citizen ticket application form, and live QR code status tracking. |
| **Back-Office Hub** | **Local Laragon** (`http://localhost:8000`) | Document archive, OCR image processing (Gemini / Ollama), certificate issuances, audit logs, and backups. |

---

## Plan A: Default (Cloudflare Tunnel to Local Laragon)

In Plan A, all data stays inside your existing local Laragon MySQL database. The public frontend on Vercel communicates securely with your local Laravel backend through a free Cloudflare Tunnel.

### Step 1: Deploy Frontend to Vercel
1. Push your repository to **GitHub** (or run `vercel` via Vercel CLI).
2. In the **Vercel Dashboard**, click **New Project** and import the repository.
3. Vercel automatically detects `vercel.json` and runs `npm run build:vercel`.
4. In **Project Settings -> Environment Variables**, add:
   - `VITE_PUBLIC_PORTAL_ONLY` = `true`
   - `VITE_API_BASE_URL` = (Your Cloudflare Tunnel URL, see Step 2)
5. Click **Deploy**.

### Step 2: Start Your Local Backend & Cloudflare Tunnel
1. Start your local services using Laragon and run [start-civicore.bat](file:///c:/laragon/www/civicore_laravel/start-civicore.bat).
2. Double-click [start-tunnel.bat](file:///c:/laragon/www/civicore_laravel/start-tunnel.bat) in the project root:
   - It will start a secure HTTPS tunnel pointing to `http://localhost:8000`.
   - Copy the public tunnel URL generated (e.g. `https://xxxx-xxxx.trycloudflare.com`).
3. Paste that tunnel URL into Vercel's `VITE_API_BASE_URL` environment variable.
4. Add your Vercel URL to your local `.env`:
   ```env
   PUBLIC_PORTAL_URL=https://your-civicore.vercel.app
   ```
   *(This ensures QR codes generated on stubs and emails link back to your public Vercel tracking site!)*

---

## Plan B: Cloud Database Fallback (24/7 Availability)

If the client later decides: *"We want citizens to submit tickets 24/7 even when our municipal hall computer is turned off at night"*, you can switch to Plan B in 2 minutes:

1. Create a free MySQL database on **TiDB Cloud**, **Aiven MySQL**, or **Clever Cloud**.
2. Run the database migration on the cloud database for the tickets table:
   ```bash
   php artisan migrate --database=cloud_portal
   ```
3. In your local `.env`, set:
   ```env
   DB_PORTAL_CONNECTION=cloud_portal
   DB_PORTAL_HOST=your-cloud-db-host
   DB_PORTAL_PORT=3306
   DB_PORTAL_DATABASE=your-cloud-db-name
   DB_PORTAL_USERNAME=your-cloud-db-user
   DB_PORTAL_PASSWORD=your-cloud-db-password
   ```
4. The local staff queue on Laragon will now read and process tickets from the cloud database, while keeping heavy document scans, OCR files, and issuances 100% on local storage!

---

## Security Guards
- When `VITE_PUBLIC_PORTAL_ONLY=true` is set on Vercel, all internal staff routes (`/dashboard`, `/documents`, `/issuances`, `/accounts`, `/backups`, `/login`) are guarded. Any public user trying to access them will see a friendly **"Municipal Intranet Restricted"** notice and will be redirected to the public portal.
