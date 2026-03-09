<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Get all documents
     */
    public function index()
    {
        $documents = DB::select("SELECT * FROM documents ORDER BY id DESC");
        return response()->json($documents);
    }

    /**
     * Create new document
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $name = $request->input('name');
        $type = $request->input('type');
        $date = $request->input('date', date('m/d/Y'));
        $size = $request->input('size', '0 MB');
        $status = $request->input('status', 'Uploaded');
        $previewData = $request->input('previewData');
        $personName = $request->input('personName', '');
        $barangay = $request->input('barangay', '');
        $metadata = $request->input('metadata');

        DB::insert("INSERT INTO documents (name, type, date, size, status, previewData, personName, barangay, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [$name, $type, $date, $size, $status, $previewData, $personName, $barangay, $metadata]);

        return response()->json(['success' => true, 'id' => DB::getPdo()->lastInsertId()]);
    }

    /**
     * Upload file
     */
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // 10MB max
            'docType' => 'nullable|string',
            'personName' => 'nullable|string',
            'barangay' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()->first()], 400);
        }

        $file = $request->file('file');
        $docType = $request->input('docType', 'Uncategorized');
        $personName = $request->input('personName', '');
        $barangay = $request->input('barangay', '');

        // Generate unique filename
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $filename = 'file-' . time() . '-' . rand(100000000, 999999999) . '.' . $extension;
        
        // Store file
        $path = $file->storeAs('uploads', $filename);

        // Get file size
        $size = number_format($file->getSize() / (1024 * 1024), 2) . ' MB';

        // Save to database
        $fileInfo = json_encode([
            'originalName' => $originalName,
            'filename' => $filename,
            'path' => $path,
            'size' => $file->getSize(),
            'mimetype' => $file->getMimeType()
        ]);

        DB::insert("INSERT INTO documents (name, type, date, size, status, previewData, personName, barangay, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [$originalName, $docType, date('m/d/Y'), $size, 'Uploaded', null, $personName, $barangay, $fileInfo]);

        return response()->json([
            'success' => true,
            'id' => DB::getPdo()->lastInsertId(),
            'filename' => $filename,
            'originalName' => $originalName,
            'size' => $size
        ]);
    }

    /**
     * Delete document
     */
    public function destroy($id)
    {
        // Get document first to delete file
        $documents = DB::select("SELECT * FROM documents WHERE id = ?", [$id]);
        
        if (count($documents) > 0) {
            $doc = $documents[0];
            if (!empty($doc->metadata)) {
                $metadata = json_decode($doc->metadata, true);
                if (isset($metadata['filename'])) {
                    Storage::delete('uploads/' . $metadata['filename']);
                }
            }
        }

        DB::delete("DELETE FROM documents WHERE id = ?", [$id]);
        
        return response()->json(['success' => true]);
    }
}
