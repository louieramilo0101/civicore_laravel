<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Represents the Ocr Controller application component.
 */
class OcrController extends Controller
{
    /**
     * Process OCR on a document stored in the database.
     * POST /api/ocr/process
     *
     * Body params:
     *   documentId  int     required
     *   docType     string  optional  (birth|death|marriage)
     */
    public function process(Request $request)
    {
        $documentId = $request->input('documentId') ?? $request->input('document_id');
        $docType    = strtolower(trim($request->input('docType', '')));
        $languages  = $request->input('languages', 'en,tl');

        if (!$documentId) {
            return response()->json(['success' => false, 'error' => 'documentId is required'], 400);
        }

        // ── Fetch document from DB ───────────────────────────────────────────
        $documents = DB::select("SELECT * FROM documents WHERE id = ?", [$documentId]);
        if (count($documents) === 0) {
            return response()->json(['success' => false, 'error' => 'Document not found'], 404);
        }

        $doc         = $documents[0];
        $filePath = $doc->file_path;

        if (empty($filePath) || !\Storage::disk('public')->exists($filePath)) {
            return response()->json(['success' => false, 'error' => 'File not found on disk'], 404);
        }

        // --- Prevent duplicate processing ---
        if (($doc->status ?? '') === 'processing') {
            return response()->json([
                'success' => true,
                'status' => 'processing',
                'message' => 'OCR is already running for this document.'
            ]);
        }

        // ── Determine extension ──────────────────────────────────────────────
        $metadata  = json_decode($doc->metadata, true);
        $mimetype  = $metadata['mimetype'] ?? 'image/jpeg';

        $extension = 'jpg';
        if (str_contains($mimetype, 'pdf'))  $extension = 'pdf';
        elseif (str_contains($mimetype, 'png'))  $extension = 'png';
        elseif (str_contains($mimetype, 'tiff')) $extension = 'tiff';
        elseif (str_contains($mimetype, 'bmp'))  $extension = 'bmp';
        elseif (str_contains($mimetype, 'text')) $extension = 'txt';
        elseif (str_contains($mimetype, 'word')) $extension = 'doc';

        // Ensure the status is set to processing
        DB::update("UPDATE documents SET status = 'processing' WHERE id = ?", [$documentId]);

        // Dispatch the coordinator to the low-priority queue to ensure sequential processing
        \App\Jobs\ProcessDocumentOcr::dispatch($documentId, $docType, $languages)->onQueue('low');

        return response()->json([
            'success' => true,
            'status' => 'processing',
            'message' => 'OCR is now running in the background. The queue processor will update the document once completed.'
        ]);
    }
}
