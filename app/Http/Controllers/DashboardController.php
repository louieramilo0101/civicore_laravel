<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Represents the Dashboard Controller application component.
 */
class DashboardController extends Controller
{
    /**
     * Get dashboard stats and chart data
     */
    public function stats()
    {
        $activeDocuments = DB::table('documents')->whereNull('deleted_at');
        $activeIssuances = DB::table('issuances')->whereNull('deleted_at');

        // Master count of finalized/approved documents (issuances)
        $totalDocuments = DB::table('issuances')->whereNull('deleted_at')->count();

        $totalIssuances = (clone $activeIssuances)
            ->where(DB::raw('LOWER(status)'), 'issued')
            ->count();

        // Queue documents count (pending user review/processing)
        $uploadPending = (clone $activeDocuments)
            ->whereIn(DB::raw('LOWER(status)'), ['pending', 'processing', 'uploaded', 'extracted'])
            ->count();

        // Approved documents count
        $processedDocs = (clone $activeDocuments)
            ->whereIn(DB::raw('LOWER(status)'), ['processed', 'issued', 'active'])
            ->count();

        $usersCount = DB::table('users')->count();

        // Count type groupings only for finalized/approved documents using certificate_type
        $docTypes = DB::table('issuances')
            ->selectRaw("COALESCE(certificate_type, 'birth') as type_group, COUNT(*) as count")
            ->whereNull('deleted_at')
            ->groupBy('type_group')
            ->get();

        $chartData = ['labels' => [], 'data' => []];
        foreach ($docTypes as $docType) {
            $chartData['labels'][] = ucwords($docType->type_group);
            $chartData['data'][] = (int) $docType->count;
        }

        // Dedicated counts for stats cards
        $birthsCount = DB::table('issuances')
            ->whereNull('deleted_at')
            ->where('certificate_type', 'birth')
            ->count();

        $deathsCount = DB::table('issuances')
            ->whereNull('deleted_at')
            ->where('certificate_type', 'death')
            ->count();

        $marriagesCount = DB::table('issuances')
            ->whereNull('deleted_at')
            ->where('certificate_type', 'marriage')
            ->count();

        // Timeline & Charts (Finalized registrations split by certificate type)
        $months = [];
        $trendBirths = [];
        $trendDeaths = [];
        $trendMarriages = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $months[] = $month->format('M');
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();

            $trendBirths[] = DB::table('issuances')
                ->whereNull('deleted_at')
                ->where('certificate_type', 'birth')
                ->whereBetween('created_at', [$start, $end])
                ->count();

            $trendDeaths[] = DB::table('issuances')
                ->whereNull('deleted_at')
                ->where('certificate_type', 'death')
                ->whereBetween('created_at', [$start, $end])
                ->count();

            $trendMarriages[] = DB::table('issuances')
                ->whereNull('deleted_at')
                ->where('certificate_type', 'marriage')
                ->whereBetween('created_at', [$start, $end])
                ->count();
        }

        $actionNeeded = (clone $activeDocuments)
            ->whereIn(DB::raw('LOWER(status)'), ['failed', 'stopped', 'error'])
            ->count();

        // Barangay distribution only for finalized/approved documents
        $barangayRows = DB::table('documents')
            ->selectRaw("COALESCE(NULLIF(barangay, ''), 'Unspecified') as barangay_name, COUNT(*) as count")
            ->whereNull('deleted_at')
            ->whereIn(DB::raw('LOWER(status)'), ['processed', 'issued', 'active'])
            ->groupBy('barangay_name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        // Calculate total Gemini tokens used and allowed token budget
        $tokensUsed = 0;
        $docMeta = DB::select("SELECT metadata FROM documents WHERE deleted_at IS NULL AND metadata IS NOT NULL");
        foreach ($docMeta as $doc) {
            $meta = json_decode($doc->metadata, true);
            if (isset($meta['image_token_cost'])) {
                $tokensUsed += (int) $meta['image_token_cost'];
            }
        }
        $tokenBudget = (int) env('GEMINI_TOKEN_BUDGET', 1000000);

        return response()->json([
            'stats' => [
                'totalDocs' => (int) $totalDocuments,
                'pendingDocs' => (int) $uploadPending,
                'totalIssuances' => (int) $totalIssuances,
                'totalUsers' => (int) $usersCount,
                'processedDocs' => (int) $processedDocs,
                'tokensUsed' => (int) $tokensUsed,
                'tokenBudget' => (int) $tokenBudget,
                'birthsCount' => (int) $birthsCount,
                'deathsCount' => (int) $deathsCount,
                'marriagesCount' => (int) $marriagesCount,
            ],
            'chartData' => [
                'docTypes' => $chartData,
                'processStatus' => [
                    'labels' => ['Complete', 'In Queue', 'Action Needed'],
                    'data' => [(int) $processedDocs, (int) $uploadPending, (int) $actionNeeded]
                ],
                'trendChart' => [
                    'labels' => $months,
                    'births' => $trendBirths,
                    'deaths' => $trendDeaths,
                    'marriages' => $trendMarriages
                ],
                'accuracyChart' => [
                    'labels' => $barangayRows->pluck('barangay_name')->values(),
                    'data' => $barangayRows->pluck('count')->map(fn($count) => (int) $count)->values()
                ]
            ]
        ]);
    }
}
