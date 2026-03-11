<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class TemplateController extends Controller
{
    /**
     * Get all templates (cached)
     */
    public function index()
    {
        // Cache templates for 60 minutes
        $templates = Cache::remember('templates.all', 60, function () {
            $results = DB::select("SELECT * FROM templates");
            $result = [];
            foreach ($results as $template) {
                $result[$template->type] = $template->content;
            }
            return $result;
        });
        
        return response()->json($templates);
    }

    /**
     * Update template
     */
    public function update(Request $request, $type)
    {
        $content = $request->input('content');
        
        // Check if template exists
        $existing = DB::select("SELECT * FROM templates WHERE type = ?", [$type]);
        
        if (count($existing) > 0) {
            DB::update("UPDATE templates SET content = ? WHERE type = ?", [$content, $type]);
        } else {
            DB::insert("INSERT INTO templates (type, content) VALUES (?, ?)", [$type, $content]);
        }
        
        // Clear cache after update
        Cache::forget('templates.all');
        
        return response()->json(['success' => true]);
    }
}
