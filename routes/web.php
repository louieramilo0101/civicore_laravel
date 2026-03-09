<?php

use Illuminate\Support\Facades\Route;

// Serve the frontend index.html for the root route
Route::get('/', function () {
    return file_get_contents(public_path('index.html'));
});

// Serve index.html for all other routes (SPA fallback)
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
