<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\DB;

class OcrController extends Controller
{
    /**
     * Process OCR on uploaded file from database
     */
    public function process(Request $request)
    {
        // Accept either document ID or file path (for backward compatibility)
        $documentId = $request->input('documentId');
        $filePath = $request->input('filePath');
        $languages = $request->input('languages', 'en,tl');

        $fullPath = null;
        $tempFile = null;

        try {
            // If documentId is provided, get file from database
            if ($documentId) {
                $documents = DB::select("SELECT * FROM documents WHERE id = ?", [$documentId]);
                
                if (count($documents) === 0) {
                    return response()->json(['success' => false, 'error' => 'Document not found'], 404);
                }

                $doc = $documents[0];
                $fileContent = $doc->file_data;

                if (empty($fileContent)) {
                    return response()->json(['success' => false, 'error' => 'File content not found in database'], 404);
                }

                $metadata = json_decode($doc->metadata, true);
                $mimetype = $metadata['mimetype'] ?? 'application/pdf';
                
                // Determine extension from mimetype
                $extension = 'pdf';
                if (strpos($mimetype, 'image/jpeg') !== false || strpos($mimetype, 'image/jpg') !== false) {
                    $extension = 'jpg';
                } elseif (strpos($mimetype, 'image/png') !== false) {
                    $extension = 'png';
                }

                // Create temporary file for OCR processing
                $tempFile = sys_get_temp_dir() . '/ocr_temp_' . time() . '.' . $extension;
                file_put_contents($tempFile, $fileContent);
                $fullPath = $tempFile;
            } 
            // Otherwise, use file path from request (backward compatibility)
            elseif ($filePath) {
                $fullPath = base_path($filePath);
                
                if (!file_exists($fullPath)) {
                    return response()->json(['success' => false, 'error' => 'File not found'], 404);
                }
            } 
            else {
                return response()->json(['success' => false, 'error' => 'Either documentId or filePath is required'], 400);
            }

            // Determine file type
            $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
            $fileType = ($ext === 'pdf') ? 'pdf' : 'image';

            // Get the OCR processor script path
            $ocrScript = base_path('ocr_processor.py');

            // Build Python command
            $python = 'python';
            $args = [
                $ocrScript,
                $fullPath,
                '--lang', $languages,
                '--type', $fileType
            ];

            // Execute Python script
            $process = Process::run($python . ' ' . implode(' ', $args));

            $stdout = $process->output();
            $stderr = $process->errorOutput();
            $exitCode = $process->exitCode();

            if ($exitCode !== 0) {
                return response()->json([
                    'success' => false,
                    'error' => 'OCR processing failed',
                    'details' => $stderr
                ], 500);
            }

            try {
            $result = json_decode($stdout, true);
            
            // If OCR was successful and we have a documentId, save the extracted text to database
            if ($documentId && isset($result['success']) && $result['success'] === true && isset($result['text'])) {
                $extractedText = $result['text'];
                DB::update("UPDATE documents SET ocr_text = ? WHERE id = ?", [$extractedText, $documentId]);
                $result['ocr_text_saved'] = true;
            }
            
            return response()->json($result);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to parse OCR results',
                    'rawOutput' => $stdout
                ], 500);
            }
        } finally {
            // Clean up temporary file
            if ($tempFile && file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }
}
