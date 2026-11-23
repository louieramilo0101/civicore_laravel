# QR code + cam2qr integration — COMPLETE

## What changed

### 1. Live kiosk QR scanner — `resources/js/components/PendingRequests.jsx`
- **Dynamic scan box**: `qrbox` changed from fixed `{ width: 220, height: 220 }` to a function that sizes at **70% of the video frame**:
  ```js
  qrbox: (videoWidth, videoHeight) => {
      const side = Math.round(Math.min(videoWidth, videoHeight) * 0.7);
      return { width: side, height: side };
  }
  ```
- **Visible reticle overlay**: A `w-[70%] h-[70%]` amber-framed reticle (`#d4a574`) renders on top of the video so users know exactly where to position the QR code.
- Live camera path is kept in the code (harmless) but effectively requires HTTPS; user confirmed no HTTPS.

### 2. Photo-capture QR decode — both `TicketScannerModal.jsx` + `PendingRequests.jsx`
- **New dependency**: `cam2qr@^1.4.0` installed via `npm install cam2qr` (13 KB gzipped, zero runtime deps, fully offline).
- **New helper**: `fileToImageData(file)` draws the selected photo file onto a canvas and returns raw RGBA `ImageData` — exactly what cam2qr consumes.
- **cam2qr is now the FIRST decode attempt** in the photo upload path, with options `tryInverted: true, tryHarder: true, maxDownscale: 2`. This handles both close-up (overflow) and far-away (oversampled) QR codes.
- **Full fallback preserved**: if cam2qr returns null, the code falls through to the existing `BarcodeDetector → Html5Qrcode` path — zero behavior change for users.
- Same `fileToImageData()` helper and decode flow lives in both `TicketScannerModal.jsx` and `PendingRequests.jsx`.

### 3. What was NOT changed (by design)
- QR **generation** (`generateQr`, mailable/controller) — already correct, no need to regenerate bigger QRs.
- **No HTTPS** — user confirmed cert installation on every device is a non-starter; live camera path remains code-level but not the active path.
- No new dependencies beyond cam2qr (user approved relaxing the “no new deps” constraint for this tiny lib).
- The earlier broken `buildScanCandidates(file)` helper was removed entirely; cam2qr's internal multi-scale (`tryHarder/maxDownscale`) replaces it.

### 4. Build verification
Both files rebuild cleanly:
- `✓ built in 29.19s` (first full build with cam2qr)
- `✓ built in 27.03s` (after PendingRequests edits)

## Open objectives
None. Everything from the original request is addressed:
- QR code back in ticket email ✓ (already supported by mailable/controller, no code change needed)
- Dynamic kiosk scan box with visible reticle ✓
- Improved native camera snapshot path via cam2qr multi-scale decoding ✓
- No new dependencies beyond the approved cam2qr package ✓
- Works on plain HTTP (no HTTPS required) ✓