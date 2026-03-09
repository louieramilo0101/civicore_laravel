<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TemplateController extends Controller
{
    /**
     * Get all templates
     */
    public function index()
    {
        $templates = DB::select("SELECT * FROM templates");
        
        $result = [];
        foreach ($templates as $template) {
            $result[$template->type] = $template->content;
        }
        
        return response()->json($result);
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
        
        return response()->json(['success' => true]);
    }
}
