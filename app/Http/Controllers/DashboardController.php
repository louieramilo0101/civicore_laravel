<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

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
        $cachedData = Cache::remember('dashboard_stats_cache', 120, function () {
            $activeDocuments = DB::table('documents')->whereNull('deleted_at');

            // Master count of finalized/approved documents (registry tables)
            $totalDocuments = DB::table('registry_births')->whereNull('deleted_at')->where('status', 'active')->count()
                + DB::table('registry_deaths')->whereNull('deleted_at')->where('status', 'active')->count()
                + DB::table('registry_marriages')->whereNull('deleted_at')->where('status', 'active')->count();

            // Queue documents count (pending user review/processing or action needed, matching Document Queue)
            $uploadPending = (clone $activeDocuments)
                ->whereNotIn(DB::raw('LOWER(status)'), ['processed', 'issued', 'active'])
                ->count();

            // Approved documents count
            $processedDocs = (clone $activeDocuments)
                ->whereIn(DB::raw('LOWER(status)'), ['processed', 'issued', 'active'])
                ->count();

            // Active system users count (excludes disabled accounts)
            $usersCount = DB::table('users')->where('is_active', 1)->count();

            // Count type groupings for finalized/approved documents
            $birthsCount = DB::table('registry_births')->whereNull('deleted_at')->where('status', 'active')->count();
            $deathsCount = DB::table('registry_deaths')->whereNull('deleted_at')->where('status', 'active')->count();
            $marriagesCount = DB::table('registry_marriages')->whereNull('deleted_at')->where('status', 'active')->count();

            // Total issued files = completed tickets (citizen requests that have been issued)
            $totalIssuances = DB::table('tickets')
                ->where('request_status', 'completed')
                ->count();

            $chartData = ['labels' => [], 'data' => []];
            foreach ([
                ['type' => 'Birth', 'count' => $birthsCount],
                ['type' => 'Death', 'count' => $deathsCount],
                ['type' => 'Marriage', 'count' => $marriagesCount],
            ] as $docType) {
                $chartData['labels'][] = $docType['type'];
                $chartData['data'][] = (int) $docType['count'];
            }

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

                $trendBirths[] = DB::table('registry_births')
                    ->whereNull('deleted_at')
                    ->where('status', 'active')
                    ->whereBetween('created_at', [$start, $end])
                    ->count();

                $trendDeaths[] = DB::table('registry_deaths')
                    ->whereNull('deleted_at')
                    ->where('status', 'active')
                    ->whereBetween('created_at', [$start, $end])
                    ->count();

                $trendMarriages[] = DB::table('registry_marriages')
                    ->whereNull('deleted_at')
                    ->where('status', 'active')
                    ->whereBetween('created_at', [$start, $end])
                    ->count();
        }

        $actionNeeded = (clone $activeDocuments)
            ->whereIn(DB::raw('LOWER(status)'), ['failed', 'stopped', 'error'])
            ->count();

        // Barangay distribution for live registry records only. Archived records
        // (status='archived' / soft-deleted) are excluded — they live in the
        // Archive Manager and should not skew the location distribution.
        // Registry data is split across birth/death/marriage tables, so we
        // aggregate the per-brgy counts here and merge them into one ranking.
        $brgyCounts = [];
        foreach (['registry_births', 'registry_deaths', 'registry_marriages'] as $table) {
            $rows = DB::table($table)
                ->selectRaw("COALESCE(NULLIF(barangay, ''), 'Unspecified') as barangay_name, COUNT(*) as count")
                ->whereNull('deleted_at')
                ->where('status', '!=', 'archived')
                ->groupBy('barangay_name')
                ->get();
            foreach ($rows as $row) {
                $brgyCounts[$row->barangay_name] = ($brgyCounts[$row->barangay_name] ?? 0) + (int) $row->count;
            }
        }
        $barangayRows = collect($brgyCounts)
            ->map(fn($count, $name) => (object) ['barangay_name' => $name, 'count' => $count])
            ->sortByDesc('count')
            ->take(5)
            ->values();

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

            // Ticket Stats for chart
            $ticketsCompleted = (int) DB::table('tickets')
                ->where('request_status', 'completed')
                ->count();
            $ticketsInQueue = (int) DB::table('tickets')
                ->whereIn('request_status', ['pending', 'ready_for_pickup'])
                ->count();
            $ticketsExpired = (int) DB::table('tickets')
                ->whereIn('request_status', ['expired', 'cancelled'])
                ->count();

            return [
                'stats' => [
                    'totalDocs' => (int) $totalDocuments,
                    'pendingDocs' => (int) $uploadPending,
                    'totalIssuances' => (int) $totalIssuances,
                    'pendingTickets' => $ticketsInQueue,
                    'ticketsCompleted' => $ticketsCompleted,
                    'ticketsExpired' => $ticketsExpired,
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
                        'uploads' => [
                            'labels' => ['Complete', 'In Queue', 'Action Needed'],
                            'data' => [(int) $processedDocs, (int) $uploadPending, (int) $actionNeeded]
                        ],
                        'tickets' => [
                            'labels' => ['Completed', 'In Queue', 'Expired/Cancelled'],
                            'data' => [$ticketsCompleted, $ticketsInQueue, $ticketsExpired]
                        ]
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
        ];
        });

        return response()->json($cachedData);
    }
}
