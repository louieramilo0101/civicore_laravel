<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class BarangayController extends Controller
{
    /**
     * Get all barangays (cached)
     */
    public function index()
    {
        // Cache barangays for 24 hours (they rarely change)
        $barangays = Cache::remember('barangays.all', 1440, function () {
            $results = DB::select("SELECT * FROM barangays ORDER BY name ASC");
            
            // If no barangays in database, return default NAIC barangays
            if (count($results) === 0) {
                return null;
            }
            
            return $results;
        });
        
        // If cache is null or empty, use default barangays
        if (empty($barangays)) {
            $naicBarangays = [
                "Gomez-Zamora (Pob.)", "Capt. C. Nazareno (Pob.)", "Ibayo Silangan",
                "Ibayo Estacion", "Kanluran", "Makina", "Sapa", "Bucana Malaki",
                "Bucana Sasahan", "Bagong Karsada", "Balsahan", "Bancaan", "Muzon",
                "Latoria", "Labac", "Mabolo", "San Roque", "Santulan", "Molino",
                "Calubcob", "Halang", "Malainen Bago", "Malainen Luma", "Palangue 1",
                "Palangue 2 & 3", "Humbac", "Munting Mapino", "Sabang", "Timalan Balsahan",
                "Timalan Concepcion"
            ];
            
            return response()->json(array_map(function($name) {
                return ['name' => $name];
            }, $naicBarangays));
        }
        
        return response()->json($barangays);
    }
}
