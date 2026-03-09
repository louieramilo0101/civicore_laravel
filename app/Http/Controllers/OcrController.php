<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Process;

class OcrController extends Controller
{
    /**
     * Process OCR on uploaded file
     */
    public function process(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'filePath' => 'required|string',
            'languages' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()->first()], 400);
        }

        $filePath = $request->input('filePath');
        $languages = $request->input('languages', 'en,tl');

        // Get the full path
        $fullPath = base_path($filePath);

        // Check if file exists
        if (!file_exists($fullPath)) {
            return response()->json(['success' => false, 'error' => 'File not found'], 404);
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
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to parse OCR results',
                'rawOutput' => $stdout
            ], 500);
        }
    }
}
