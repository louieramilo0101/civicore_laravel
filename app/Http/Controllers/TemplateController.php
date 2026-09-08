<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Represents the Template Controller application component.
 */
class TemplateController extends Controller
{
    /**
     * Get all PDF templates from the Templates folder
     */
    public function index()
    {
        $directory = base_path('Templates');
        if (!File::exists($directory)) {
            return response()->json([]);
        }

        $files = File::files($directory);
        $templates = [];

        // Get profiles from DB
        try {
            $profiles = DB::table('template_profiles')->get()->keyBy('file_path');
        } catch (\Exception $e) {
            Log::error('Template profiles load failure: ' . $e->getMessage());
            $profiles = collect();
        }

        foreach ($files as $file) {
            if (strtolower($file->getExtension()) !== 'pdf') continue;

            $relativePath = $file->getFilename();
            $profile = $profiles->get($relativePath);
            
            $detectedType = 'unknown';
            if ($profile) {
                $detectedType = $profile->type;
            } else {
                // Heuristic matching based on filename
                $lowerName = strtolower($relativePath);
                if (str_contains($lowerName, 'birth')) $detectedType = 'birth';
                elseif (str_contains($lowerName, 'death')) $detectedType = 'death';
                elseif (str_contains($lowerName, 'marriage')) $detectedType = 'marriage';
            }

            $templates[] = [
                'name' => $profile->name ?? str_replace('.pdf', '', $relativePath),
                'file_path' => $relativePath,
                'type' => $detectedType,
                'config' => isset($profile->config) ? json_decode($profile->config) : null,
                'id' => $profile->id ?? null,
            ];
        }

        return response()->json($templates);
    }

    /**
     * Update or create a template profile/config
     */
    public function updateConfig(Request $request)
    {
        $filePath = $request->input('file_path');
        $config = $request->input('config');
        $name = $request->input('name');
        $type = $request->input('type');

        $exists = DB::table('template_profiles')->where('file_path', $filePath)->first();

        if ($exists) {
            DB::table('template_profiles')
                ->where('file_path', $filePath)
                ->update([
                    'config' => json_encode($config),
                    'name' => $name ?? $exists->name,
                    'type' => $type ?? $exists->type,
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('template_profiles')->insert([
                'file_path' => $filePath,
                'name' => $name ?? str_replace('.pdf', '', $filePath),
                'type' => $type ?? 'unknown',
                'config' => json_encode($config),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Upload a new PDF template to the Templates folder
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240', // 10MB max
            'type' => 'required|string|in:birth,death,marriage,marriage_license'
        ]);

        $file = $request->file('file');
        $type = $request->input('type');
        $originalName = $file->getClientOriginalName();
        
        // Save to Templates directory
        $directory = base_path('Templates');
        if (!File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $file->move($directory, $originalName);

        // Create initial profile
        DB::table('template_profiles')->updateOrInsert(
            ['file_path' => $originalName],
            [
                'name' => str_replace('.pdf', '', $originalName),
                'type' => $type,
                'updated_at' => now(),
                'created_at' => now()
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Get a preview image of a PDF template page
     */
    /**
     * Get a preview image of a PDF template page
     */
    public function getPreview(Request $request)
    {
        $fileName = $request->query('file');
        $type = $request->query('type');
        $page = (int) $request->query('page', 1);

        if (!$fileName && !$type) {
            return response()->json(['error' => 'File or type parameter is required'], 400);
        }

        $directory = base_path('Templates');

        // 1. If type is passed or fileName matches category key (birth, death, marriage)
        $effectiveType = strtolower($type ?: $fileName);
        if (in_array($effectiveType, ['birth', 'death', 'marriage', 'marriage_license'])) {
            $pathFromService = \App\Services\TemplateConfigService::getTemplatePath($effectiveType);
            if ($pathFromService && File::exists($pathFromService)) {
                return response()->file($pathFromService);
            }
        }

        // 2. Direct file path match in Templates folder
        if ($fileName) {
            $directPath = base_path('Templates' . DIRECTORY_SEPARATOR . $fileName);
            if (File::exists($directPath)) {
                $ext = strtolower(pathinfo($directPath, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                    return response()->file($directPath);
                }
            }

            // 3. Search for existing split page images matching filename or base name (handling typos)
            $baseName = pathinfo($fileName, PATHINFO_FILENAME);
            $cleanBase = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($baseName));

            $allFiles = File::exists($directory) ? File::files($directory) : [];
            foreach ($allFiles as $f) {
                $fName = $f->getFilename();
                $fExt = strtolower($f->getExtension());
                if (!in_array($fExt, ['jpg', 'jpeg', 'png', 'webp'])) continue;

                $fClean = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($fName));
                
                // Match page number and base name substring or typo match (e.g. tempalte vs template)
                if (str_contains($fName, "_page_{$page}") || str_contains($fName, "page_{$page}")) {
                    if (str_contains($fClean, substr($cleanBase, 0, 10)) || str_contains($cleanBase, substr($fClean, 0, 10))) {
                        return response()->file($f->getPathname());
                    }
                }
            }

            // 4. Try Python OCR server to split PDF if it's a PDF
            if (File::exists($directPath) && strtolower(pathinfo($directPath, PATHINFO_EXTENSION)) === 'pdf') {
                try {
                    $response = Http::timeout(10)->post('http://127.0.0.1:5000/split', [
                        'file_path' => $directPath
                    ]);
                } catch (\Exception $e) {
                    Log::warn("OCR server split unavailable: " . $e->getMessage());
                }

                $previewPath = base_path('Templates' . DIRECTORY_SEPARATOR . "{$baseName}_page_{$page}.jpg");
                if (File::exists($previewPath)) {
                    return response()->file($previewPath);
                }
            }
        }

        // 5. Fallback: try finding ANY template image matching type in Templates directory
        if (!empty($effectiveType)) {
            $allFiles = File::exists($directory) ? File::files($directory) : [];
            foreach ($allFiles as $f) {
                $fExt = strtolower($f->getExtension());
                if (!in_array($fExt, ['jpg', 'jpeg', 'png', 'webp'])) continue;
                $fLower = strtolower($f->getFilename());
                if (str_contains($fLower, $effectiveType) || ($effectiveType === 'marriage' && str_contains($fLower, 'marriage'))) {
                    return response()->file($f->getPathname());
                }
            }
        }

        // 6. Final fallback: Return an elegant SVG certificate backdrop
        $title = ucfirst($effectiveType ?: 'Civil Registry') . ' Form Template';
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100" fill="none">
            <rect width="800" height="1100" fill="#ffffff"/>
            <rect x="20" y="20" width="760" height="1060" fill="none" stroke="#0f172a" stroke-width="3"/>
            <rect x="28" y="28" width="744" height="1044" fill="none" stroke="#94a3b8" stroke-width="1"/>
            <text x="400" y="80" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">' . strtoupper($title) . '</text>
            <text x="400" y="110" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">OFFICIAL REPUBLIC OF THE PHILIPPINES CIVIL REGISTRY FORM</text>
            <line x1="40" y1="130" x2="760" y2="130" stroke="#cbd5e1" stroke-width="2"/>
        </svg>';

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Content-Disposition' => 'inline; filename="template_fallback.svg"'
        ]);
    }
}

