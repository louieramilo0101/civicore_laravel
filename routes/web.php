<?php
use Illuminate\Support\Facades\Route;

// This tells Laravel: "For ANY URL, just load app.blade.php and let React figure it out"
Route::get('/{any?}', function () {
    return view('app'); // This matches your app.blade.php file
})->where('any', '.*'); 