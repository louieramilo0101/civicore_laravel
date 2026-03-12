<?php

use Illuminate\Support\Facades\Route;

// Serve the frontend index.html for the root route
Route::get('/', function () {
    return view('app');
})->name('home');

// SPA fallback route
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
