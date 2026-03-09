<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BarangayController extends Controller
{
    /**
     * Get all barangays
     */
    public function index()
    {
        $barangays = DB::select("SELECT * FROM barangays ORDER BY name ASC");
        
        // If no barangays in database, return default NAIC barangays
        if (count($barangays) === 0) {
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
