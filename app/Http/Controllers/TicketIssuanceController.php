<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\EncryptedJson;

/**
 * Handles CRUD for citizen-ticket-linked issuances (ticket_issuances table).
 * These are distinct from the Registry Database (issuances table), which only
 * holds officially uploaded civil registry documents.
 */
class TicketIssuanceController extends Controller
{
    /**
     * GET /api/ticket-issuances
     * Returns paginated ticket issuances for the Reports "Client Procured" view.
     */
    public function index(Request $request)
    {
        $page    = (int) $request->query('page', 1);
        $perPage = min((int) $request->query('per_page', 500), 1000);
        $type    = $request->query('type', '');
        $search  = $request->query('search', '');
        $dateFrom = $request->query('date_from', '');
        $dateTo   = $request->query('date_to', '');

        $conditions = ['ti.deleted_at IS NULL'];
        $params     = [];

        if (!empty($type) && $type !== 'all') {
            $conditions[] = 'ti.type = ?';
            $params[]     = $type;
        }

        if (!empty($search)) {
            $conditions[] = '(ti.name LIKE ? OR ti.certNumber LIKE ? OR ti.ticket_number LIKE ? OR ti.or_number LIKE ? OR ti.barangay LIKE ?)';
            $term = "%{$search}%";
            for ($k = 0; $k < 5; $k++) $params[] = $term;
        }

        if (!empty($dateFrom)) {
            $conditions[] = 'DATE(ti.created_at) >= ?';
            $params[]     = $dateFrom;
        }
        if (!empty($dateTo)) {
            $conditions[] = 'DATE(ti.created_at) <= ?';
            $params[]     = $dateTo;
        }

        $where = 'WHERE ' . implode(' AND ', $conditions);

        $total = DB::selectOne(
            "SELECT COUNT(*) as total FROM ticket_issuances ti $where",
            $params
        )->total;

        $offset = ($page - 1) * $perPage;
        $rows   = DB::select(
            "SELECT ti.*, d.file_path AS source_file_path, d.image_path AS source_image_path
             FROM ticket_issuances ti
             LEFT JOIN documents d ON d.id = ti.document_id
             $where
             ORDER BY ti.id DESC
             LIMIT ? OFFSET ?",
            [...$params, $perPage, $offset]
        );

        foreach ($rows as $row) {
            $row->extracted_data = $this->decryptForExport($row->extracted_data);
            $row->file_url       = $row->document_id
                ? url('/api/documents/view/' . $row->document_id . '?raw=1')
                : null;
        }

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => (int) ceil($total / $perPage),
            ],
        ]);
    }

    /**
     * DELETE /api/ticket-issuances/{id}
     * Soft-deletes a ticket issuance record.
     */
    public function destroy(Request $request, $id)
    {
        $row = DB::table('ticket_issuances')->where('id', $id)->first();
        if (!$row) {
            return response()->json(['success' => false, 'error' => 'Not found'], 404);
        }

        DB::table('ticket_issuances')->where('id', $id)->update([
            'deleted_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/ticket-issuances/{id}/undo
     * Restores a soft-deleted ticket issuance.
     */
    public function undo($id)
    {
        DB::table('ticket_issuances')->where('id', $id)->update([
            'deleted_at' => null,
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function decryptForExport(?string $raw): mixed
    {
        if (!$raw) return [];
        try {
            $decoded = EncryptedJson::decode($raw);
            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }
    }
}

