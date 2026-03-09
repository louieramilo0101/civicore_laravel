<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class IssuanceController extends Controller
{
    /**
     * Get all issuances
     */
    public function index()
    {
        $issuances = DB::select("SELECT * FROM issuances ORDER BY id DESC");
        return response()->json($issuances);
    }

    /**
     * Get single issuance
     */
    public function show($id)
    {
        $issuances = DB::select("SELECT * FROM issuances WHERE id = ?", [$id]);
        
        if (count($issuances) === 0) {
            return response()->json(['error' => 'Not found'], 404);
        }
        
        return response()->json($issuances[0]);
    }

    /**
     * Create new issuance
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'certNumber' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'issuanceDate' => 'nullable|string',
            'status' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $certNumber = $request->input('certNumber');
        $type = $request->input('type');
        $name = $request->input('name');
        $barangay = $request->input('barangay', '');
        $issuanceDate = $request->input('issuanceDate', date('m/d/Y'));
        $status = $request->input('status', 'Active');

        DB::insert("INSERT INTO issuances (certNumber, type, name, barangay, issuanceDate, status) VALUES (?, ?, ?, ?, ?, ?)", 
            [$certNumber, $type, $name, $barangay, $issuanceDate, $status]);

        return response()->json(['success' => true, 'id' => DB::getPdo()->lastInsertId()]);
    }

    /**
     * Delete issuance
     */
    public function destroy($id)
    {
        DB::delete("DELETE FROM issuances WHERE id = ?", [$id]);
        
        return response()->json(['success' => true]);
    }

    /**
     * Get next certificate number
     */
    public function nextCertNumber($type)
    {
        // Determine prefix based on type
        $prefix = 'BC'; // Birth Certificate
        if ($type === 'death') {
            $prefix = 'DC'; // Death Certificate
        } elseif ($type === 'marriage' || $type === 'marriage_license') {
            $prefix = 'ML'; // Marriage License
        }
        
        $year = date('Y');
        
        // Get the last certificate number for this type and year
        $results = DB::select("SELECT certNumber FROM issuances WHERE type = ? AND certNumber LIKE ? ORDER BY id DESC LIMIT 1", 
            [$type, $prefix . '-' . $year . '%']);
        
        $nextNum = 1;
        if (count($results) > 0) {
            $lastCertNum = $results[0]->certNumber;
            $parts = explode('-', $lastCertNum);
            if (count($parts) === 3) {
                $nextNum = intval($parts[2]) + 1;
            }
        }
        
        $certNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
        
        return response()->json(['certNumber' => $certNumber]);
    }
}
