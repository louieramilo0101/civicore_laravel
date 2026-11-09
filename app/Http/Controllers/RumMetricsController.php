<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Collects and aggregates real user performance metrics (Core Web Vitals) */
class RumMetricsController extends Controller
{
    /**
     * Store incoming Web Vitals metric payload from client.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:32',
                'value' => 'required|numeric',
                'rating' => 'nullable|string|max:32',
                'page' => 'nullable|string|max:255',
                'title' => 'nullable|string|max:255',
                'connection' => 'nullable|string|max:32',
                'device' => 'nullable|string|max:32',
                'browser' => 'nullable|string|max:64',
                'os' => 'nullable|string|max:64',
            ]);

            $metricName = strtolower(trim($validated['name']));
            $allowedMetrics = ['lcp', 'inp', 'cls', 'fcp', 'ttfb', 'fid'];

            if (!in_array($metricName, $allowedMetrics)) {
                return response()->json(['error' => 'Unsupported metric type'], 422);
            }

            // Scrub PII: do NOT log citizen full IP or user session unless auth'd
            $ip = $request->ip();
            $anonymizedIp = preg_replace('/\.\d+$/', '.0', $ip); // Mask last octet for privacy

            DB::table('rum_metrics')->insert([
                'metric_name' => $metricName,
                'value' => round((float) $validated['value'], 4),
                'rating' => strtolower(trim($validated['rating'] ?? 'unknown')),
                'page_path' => $validated['page'] ?? '/',
                'page_title' => $validated['title'] ?? 'CiviCORE',
                'connection_type' => $validated['connection'] ?? 'unknown',
                'device_type' => $validated['device'] ?? 'desktop',
                'browser' => $validated['browser'] ?? 'unknown',
                'os' => $validated['os'] ?? 'unknown',
                'ip_address' => $anonymizedIp,
                'user_id' => auth()->id(),
                'recorded_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['status' => 'recorded'], 201);
        } catch (\Throwable $e) {
            Log::error('RUM metric store failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to record metric'], 500);
        }
    }

    /**
     * Get aggregated RUM metrics for dashboard reporting (SuperAdmin/Admin).
     */
    public function stats(Request $request)
    {
        $days = (int) $request->input('days', 30);
        $since = now()->subDays($days);

        $metrics = DB::table('rum_metrics')
            ->where('recorded_at', '>=', $since)
            ->select('metric_name', DB::raw('AVG(value) as avg_value'), DB::raw('COUNT(*) as total_samples'))
            ->groupBy('metric_name')
            ->get()
            ->keyBy('metric_name');

        $byPage = DB::table('rum_metrics')
            ->where('recorded_at', '>=', $since)
            ->select('page_path', 'metric_name', DB::raw('AVG(value) as avg_value'))
            ->groupBy('page_path', 'metric_name')
            ->get()
            ->groupBy('page_path');

        $ratings = DB::table('rum_metrics')
            ->where('recorded_at', '>=', $since)
            ->select('metric_name', 'rating', DB::raw('COUNT(*) as count'))
            ->groupBy('metric_name', 'rating')
            ->get();

        return response()->json([
            'period_days' => $days,
            'summary' => $metrics,
            'by_page' => $byPage,
            'ratings' => $ratings,
        ]);
    }
}