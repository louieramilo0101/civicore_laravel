<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\Setting;
use App\Models\Announcement;

/**
 * Represents the Public Controller application component.
 */
class PublicController extends Controller
{
    /**
     * Get public settings like opening hours and announcements (Cached for 60 seconds).
     */
    public function config()
    {
        try {
            $data = Cache::remember('public_config', 60, function () {
                $settings = Setting::whereIn('key', ['opening_hours'])
                    ->get()
                    ->pluck('value', 'key');
                
                $announcements = Announcement::where('is_active', true)->orderBy('created_at', 'desc')->get();

                return [
                    'opening_hours' => $settings->get('opening_hours', 'Monday — Friday: 8:00 AM - 5:00 PM'),
                    'announcements' => $announcements
                ];
            });

            return response()->json($data)->header('Cache-Control', 'public, max-age=30');
        } catch (\Exception $e) {
            \Log::error('Public config failure: ' . $e->getMessage());
            return response()->json([
                'opening_hours' => 'Monday — Friday: 8:00 AM - 5:00 PM',
                'announcements' => []
            ], 200);
        }
    }

    /**
     * Get statistical numbers for real-time frontend (Cached for 15 seconds).
     */
    public function stats()
    {
        try {
            $data = Cache::remember('public_stats', 15, function () {
                // Count only officially issued issuances (matching the Dashboard's TOTAL ISSUED FILES count)
                $totalIssued = DB::table('issuances')
                    ->whereNull('deleted_at')
                    ->where(DB::raw('LOWER(status)'), 'issued')
                    ->count();

                // Average response simulation based on total issued records
                $baseLatencyMs = 800;
                $factor = log(max($totalIssued, 1) + 1) * 15;
                $avgResponse = round(($baseLatencyMs - $factor) / 1000, 2);
                $avgResponse = max($avgResponse, 0.21);

                return [
                    'processed'  => $totalIssued,   // finalized/issued files only
                    'response_s' => $avgResponse,
                ];
            });

            return response()->json($data)->header('Cache-Control', 'public, max-age=15');
        } catch (\Exception $e) {
            \Log::error('Public stats failure: ' . $e->getMessage());
            return response()->json([
                'processed' => 0,
                'response_s' => 0.21,
            ], 200);
        }
    }
}
