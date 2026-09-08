<?php

/**
 * Registers the application's API routes and middleware groups.
 */
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\IssuanceController;
use App\Http\Controllers\BarangayController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\OcrController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\TicketController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes use the 'web' middleware group so that Laravel session cookies
| (laravel_session) are available — required for session-based auth.
|
*/

Route::middleware('api')->group(function () {

    // ── Public APIs (no session start required)
    Route::get('/public/config',    [PublicController::class, 'config']);
    Route::get('/public/stats',     [PublicController::class, 'stats']);
    Route::get('/announcements',    [AnnouncementController::class, 'index']);
    Route::get('/templates',        [TemplateController::class, 'index']);
    Route::get('/templates/preview', [TemplateController::class, 'getPreview']);
    Route::post('/documents/bulk-process', [DocumentController::class, 'bulkProcess']);
    Route::post('/public/tickets',         [TicketController::class, 'store']);
    Route::get('/public/tickets/{token}',  [TicketController::class, 'showByToken']);

    // V1 Public API Routes
    Route::post('/v1/tickets',             [TicketController::class, 'store']);
    Route::get('/v1/tickets/{token}',      [TicketController::class, 'showByToken']);
    Route::post('/v1/tickets/scan',        [TicketController::class, 'scanCheckIn']);
});

Route::middleware('web')->group(function () {

    // ── Auth (Unprotected / Session starting) ────────────────────────────────
    Route::post('/login',           [AuthController::class, 'login']);
    Route::get('/session',          [AuthController::class, 'session']);

    // ── Protected Routes (Require Session Auth) ──────────────────────────────
    Route::middleware('auth.session')->group(function () {
        Route::post('/logout',          [AuthController::class, 'logout']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/verify-password', [AuthController::class, 'verifyPassword']);

        // Users (General Profile Actions)
        Route::get('/users',                [UserController::class, 'index']);
        Route::get('/users/{id}',           [UserController::class, 'show']);
        Route::put('/users/{id}/profile',   [UserController::class, 'updateProfile']);

        // Dashboard
        Route::get('/dashboard/stats',      [DashboardController::class, 'stats']);

        // Email Verification
        Route::post('/verification/send',   [VerificationController::class, 'send']);
        Route::post('/verification/verify', [VerificationController::class, 'verify']);

        // Documents
        Route::get('/documents/export',             [DocumentController::class, 'exportReport']);
        Route::get('/documents',                    [DocumentController::class, 'index']);
        Route::get('/documents/history',            [DocumentController::class, 'history']);
        Route::post('/documents',                   [DocumentController::class, 'store']);
        Route::post('/documents/manual',            [DocumentController::class, 'storeManual']);
        Route::put('/documents/{id}',               [DocumentController::class, 'update']);
        Route::delete('/documents/{id}',            [DocumentController::class, 'destroy']);
        Route::post('/documents/upload',            [DocumentController::class, 'upload']);
        Route::post('/documents/{id}/quick-approve', [DocumentController::class, 'quickApprove']);
        Route::post('/documents/{id}/toggle-ocr',   [DocumentController::class, 'toggleOcr']);
        Route::get('/documents/download/{id}',      [DocumentController::class, 'download']);
        Route::get('/documents/view/{id}',          [DocumentController::class, 'view']);
        Route::get('/documents/download-txt/{id}',  [DocumentController::class, 'downloadTxt']);
        Route::post('/documents/{id}/check-duplicate', [DocumentController::class, 'checkDuplicate']);

        // OCR
        Route::post('/ocr/process', [OcrController::class, 'process']);
        Route::get('/documents/{id}/status', function ($id) {
            $doc = DB::selectOne("SELECT status FROM documents WHERE id = ?", [$id]);
            return response()->json(['status' => $doc ? $doc->status : 'not_found']);
        });

        // Issuances
        Route::get('/issuances',                          [IssuanceController::class, 'index']);
        Route::get('/issuances/{id}',                     [IssuanceController::class, 'show']);
        Route::get('/issuances/download/{id}',            [IssuanceController::class, 'download']);
        Route::get('/issuances/view/{id}',                [IssuanceController::class, 'view']);
        Route::post('/issuances',                         [IssuanceController::class, 'store']);
        Route::post('/issuances/{id}/request-print',      [IssuanceController::class, 'requestPrint']);
        Route::post('/issuances/{id}/approve-print',      [IssuanceController::class, 'approvePrint']);
        Route::post('/issuances/{id}/reject-print',       [IssuanceController::class, 'rejectPrint']);
        Route::put('/issuances/{id}',                     [IssuanceController::class, 'update']);
        Route::delete('/issuances/{id}',                  [IssuanceController::class, 'destroy']);
        Route::post('/issuances/{id}/undo',               [IssuanceController::class, 'undo']);
        Route::post('/issuances/{id}/issue',              [IssuanceController::class, 'markAsIssued']);
        Route::get('/issuances/next-cert-number/{type}',  [IssuanceController::class, 'nextCertNumber']);

        Route::post('/issuances/ocr-search',              [IssuanceController::class, 'ocrSearch']);

        // Barangays
        Route::get('/barangays', [BarangayController::class, 'index']);

        // Activity Logs
        Route::get('/activity-logs',     [ActivityLogController::class, 'index']);
        Route::post('/activity-logs',    [ActivityLogController::class, 'store']);

        Route::get('/tickets',                     [TicketController::class, 'index']);
        Route::put('/tickets/{id}/status',         [TicketController::class, 'updateStatus']);
        Route::post('/tickets/{id}/link-document', [TicketController::class, 'linkDocument']);
        Route::post('/tickets/walk-in',            [TicketController::class, 'storeWalkIn']);
        Route::get('/tickets/archived',            [TicketController::class, 'archived']);
        Route::post('/tickets/{id}/restore',       [TicketController::class, 'restore']);
        Route::delete('/tickets/{id}/purge',       [TicketController::class, 'purge']);
        Route::delete('/tickets/{id}',             [TicketController::class, 'destroy']);

        // V1 Staff API Routes
        Route::get('/v1/tickets',                  [TicketController::class, 'index']);
        Route::get('/v1/staff/tickets/digital-stats', [TicketController::class, 'digitalStats']);
        Route::patch('/v1/tickets/{id}/attach',    [TicketController::class, 'attachDocument']);
        Route::patch('/v1/tickets/{id}/cancel',    [TicketController::class, 'cancelTicket']);
        Route::post('/v1/tickets/{id}/issue',      [TicketController::class, 'issueDocument']);
        Route::post('/v1/tickets/walk-in',         [TicketController::class, 'storeWalkIn']);

        // Document Archive/Undo (Restore) accessible to all authenticated users
        Route::get('/documents/archived',           [DocumentController::class, 'archived']);
        Route::post('/documents/{id}/undo',         [DocumentController::class, 'undo']);

        // ── Admin-Only Routes (Require Admin/SuperAdmin Role) ────────────────
        Route::middleware('admin')->group(function () {
            // Document Archive/Purge
            Route::delete('/documents/{id}/purge',      [DocumentController::class, 'purge']);

            // Template Configuration
            Route::post('/templates/upload',            [TemplateController::class, 'upload']);
            Route::post('/templates/config',            [TemplateController::class, 'updateConfig']);

            // Portal Settings
            Route::get('/settings',                     [SettingController::class, 'index']);
            Route::post('/settings',                    [SettingController::class, 'update']);

            // Announcements Management
            Route::post('/announcements',               [AnnouncementController::class, 'store']);
            Route::put('/announcements/{id}',           [AnnouncementController::class, 'update']);
            Route::delete('/announcements/{id}',        [AnnouncementController::class, 'destroy']);

            // User Account Management (Requires SuperAdmin role)
            Route::middleware('superadmin')->group(function () {
                Route::post('/users',                       [UserController::class, 'store']);
                Route::post('/create-account',              [UserController::class, 'createAccount']);
                Route::put('/users/{id}',                   [UserController::class, 'update']);
                Route::delete('/users/{id}',                [UserController::class, 'destroy']);

            });
        });
    });
});
