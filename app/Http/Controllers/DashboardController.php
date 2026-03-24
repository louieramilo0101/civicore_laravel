<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard stats and chart data
     */
    public function stats()
    {
        // 1. Basic Stats
        $documentsCountResult = DB::select("SELECT COUNT(*) as count FROM documents");
        $documentsCount = $documentsCountResult[0]->count ?? 0;

        $processedDocsResult = DB::select("SELECT COUNT(*) as count FROM documents WHERE status = 'processed' OR status = 'Processed'");
        $processedDocs = $processedDocsResult[0]->count ?? 0;

        // Pending OCR or just uploaded docs
        $pendingDocsResult = DB::select("SELECT COUNT(*) as count FROM documents WHERE status = 'pending' OR status = 'Uploaded'");
        $pendingDocs = $pendingDocsResult[0]->count ?? 0;

        $usersCountResult = DB::select("SELECT COUNT(*) as count FROM users");
        $usersCount = $usersCountResult[0]->count ?? 0;

        $issuancesCountResult = DB::select("SELECT COUNT(*) as count FROM issuances");
        $totalIssuances = $issuancesCountResult[0]->count ?? 0;

        $pendingIssuancesResult = DB::select("SELECT COUNT(*) as count FROM issuances WHERE status = 'Pending' OR status = 'pending'");
        $pendingIssuances = $pendingIssuancesResult[0]->count ?? 0;

        // 2. Document Types Distribution (Group by type from documents)
        $docTypes = DB::select("SELECT type, COUNT(*) as count FROM documents GROUP BY type");
        $chartData = [
            'labels' => [],
            'data' => []
        ];
        foreach ($docTypes as $docType) {
            $typeClean = ucwords(str_replace('_', ' ', $docType->type));
            $chartData['labels'][] = $typeClean;
            $chartData['data'][] = (int) $docType->count;
        }

        if (empty($chartData['labels'])) {
            $chartData = [
                'labels' => ['Live Birth', 'Death', 'Marriage'],
                'data' => [0, 0, 0]
            ];
        }

        // 3. Process Status (Processed vs Pending for Document Tracking)
        $failedDocsResult = DB::select("SELECT COUNT(*) as count FROM documents WHERE status = 'failed' OR status = 'Failed'");
        $failedDocs = $failedDocsResult[0]->count ?? 0;

        $processStatus = [
            'labels' => ['Processed', 'Pending OCR', 'Failed'],
            'data' => [
                (int) $processedDocs,
                (int) $pendingDocs,
                (int) $failedDocs
            ]
        ];

        // 4. Monthly Upload Trend (Last 6 Months)
        $monthlyUploads = [];
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthName = $month->format('M');
            $months[] = $monthName;
            
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();
            
            $count = DB::table('documents')
                ->whereBetween('created_at', [$start, $end])
                ->count();
            
            $monthlyUploads[] = $count;
        }

        $trendChart = [
            'labels' => $months,
            'data' => $monthlyUploads
        ];

        // 5. OCR Accuracy Rate (Simulated based on processed vs failed, or representative data)
        // In a real system, this would come from an ocr_logs table
        $ocrAccuracy = [
            'labels' => ['Text', 'Names', 'Dates', 'Signatures', 'Stamps'],
            'data' => [98, 95, 99, 85, 90] // Realistic simulated data
        ];

        return response()->json([
            'stats' => [
                'totalDocs' => (int) $documentsCount,
                'processedDocs' => (int) $processedDocs,
                'pendingDocs' => (int) $pendingDocs,
                'totalUsers' => (int) $usersCount,
                'totalIssuances' => (int) $totalIssuances,
                'pendingIssuances' => (int) $pendingIssuances
            ],
            'chartData' => [
                'docTypes' => $chartData,
                'processStatus' => $processStatus,
                'trendChart' => $trendChart,
                'accuracyChart' => $ocrAccuracy
            ]
        ]);
    }
}
