<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\IssuanceController;
use App\Http\Controllers\BarangayController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\OcrController;
use App\Http\Controllers\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('web')->group(function () {
    Route::get('/debug-auth', function (Request $request) {
        return [
            'user' => $request->user(),
            'session_exists' => $request->session()->has('user'),
            'role_in_session' => $request->session()->get('user.role'),
            'total_users' => \App\Models\User::count(),
            'roles_available' => \App\Models\User::pluck('role', 'email')
        ];
    });

// Auth Routes - need session middleware for cookie handling
Route::post('/login', [AuthController::class, 'login']);
Route::get('/session', [AuthController::class, 'session']);

// Auth Routes that need session
Route::post('/logout', [AuthController::class, 'logout']);
Route::post('/change-password', [AuthController::class, 'changePassword']);
Route::post('/verify-password', [AuthController::class, 'verifyPassword']);

// User Routes
Route::get('/users', [UserController::class, 'index']);
Route::get('/users/{id}', [UserController::class, 'show']);
Route::post('/users', [UserController::class, 'store']);
Route::post('/create-account', [UserController::class, 'createAccount']);
Route::put('/users/{id}', [UserController::class, 'update']);
Route::put('/users/{id}/profile', [UserController::class, 'updateProfile']);
Route::delete('/users/{id}', [UserController::class, 'destroy']);

// Dashboard Routes
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

// Document Routes
Route::get('/documents', [DocumentController::class, 'index']);
Route::post('/documents', [DocumentController::class, 'store']);
Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);
Route::post('/documents/upload', [DocumentController::class, 'upload']);
Route::get('/documents/download/{id}', [DocumentController::class, 'download']);

// OCR Routes
Route::post('/ocr/process', [OcrController::class, 'process']);

// Issuance Routes
Route::get('/issuances', [IssuanceController::class, 'index']);
Route::get('/issuances/{id}', [IssuanceController::class, 'show']);
Route::post('/issuances', [IssuanceController::class, 'store']);
Route::delete('/issuances/{id}', [IssuanceController::class, 'destroy']);
Route::get('/issuances/next-cert-number/{type}', [IssuanceController::class, 'nextCertNumber']);

// Barangay Routes
Route::get('/barangays', [BarangayController::class, 'index']);

// Template Routes
Route::get('/templates', [TemplateController::class, 'index']);
Route::put('/templates/{type}', [TemplateController::class, 'update']);

});
