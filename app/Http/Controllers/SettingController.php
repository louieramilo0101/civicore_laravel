<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use App\Models\Setting;
use App\Models\User;

/**
 * Represents the Setting Controller application component.
 */
class SettingController extends Controller
{
    /**
     * Get all portal settings.
     */
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        // Defaults
        if (!isset($settings['ticket_limits_enabled'])) {
            $settings['ticket_limits_enabled'] = '1';
        }
        if (!isset($settings['ocr_engine'])) {
            $settings['ocr_engine'] = 'gemini';
        }
        if (!isset($settings['ollama_model'])) {
            $settings['ollama_model'] = 'qwen2.5vl:3b';
        }

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    /**
     * Update settings. Only allowed for SuperAdmins/Admins depending on rules.
     * We'll allow any logged-in valid staff (Admin, SuperAdmin) to update portal settings.
     */
    public function update(Request $request)
    {
        $userId = $request->session()->get('user_id');
        $actor = $userId ? User::find($userId) : null;

        if (!$actor || !in_array($actor->role, ['Admin', 'SuperAdmin'])) {
            return response()->json(['error' => 'Unauthorized access.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'opening_hours'         => 'nullable|string|max:255',
            'announcement_active'   => 'nullable|boolean',
            'announcement_text'     => 'nullable|string|max:500',
            'ticket_limits_enabled' => 'nullable|boolean',
            'ocr_engine'            => 'nullable|string|in:gemini,ollama',
            'ollama_model'          => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        // Update Opening Hours
        if ($request->has('opening_hours')) {
            Setting::updateOrCreate(
                ['key' => 'opening_hours'],
                ['value' => $request->input('opening_hours')]
            );
        }

        // Announcement State
        if ($request->has('announcement_active')) {
            Setting::updateOrCreate(
                ['key' => 'announcement_active'],
                ['value' => $request->input('announcement_active') ? '1' : '0']
            );
        }

        // Announcement Text
        if ($request->has('announcement_text')) {
            Setting::updateOrCreate(
                ['key' => 'announcement_text'],
                ['value' => $request->input('announcement_text')]
            );
        }

        // Ticket Rate Limits Enable/Disable
        if ($request->has('ticket_limits_enabled')) {
            Setting::updateOrCreate(
                ['key' => 'ticket_limits_enabled'],
                ['value' => $request->input('ticket_limits_enabled') ? '1' : '0']
            );
        }

        // OCR Engine Selection (gemini vs ollama)
        if ($request->has('ocr_engine')) {
            Setting::updateOrCreate(
                ['key' => 'ocr_engine'],
                ['value' => $request->input('ocr_engine')]
            );
        }

        // Ollama Model Selection
        if ($request->has('ollama_model')) {
            Setting::updateOrCreate(
                ['key' => 'ollama_model'],
                ['value' => $request->input('ollama_model')]
            );
        }

        Cache::forget('public_config');

        return response()->json(['success' => true, 'message' => 'Portal configuration updated successfully.']);
    }

    /**
     * Check live status of OCR engines (Gemini & local Ollama).
     */
    public function ocrStatus(Request $request)
    {
        $userId = $request->session()->get('user_id');
        $actor = $userId ? User::find($userId) : null;

        if (!$actor || !in_array($actor->role, ['Admin', 'SuperAdmin'])) {
            return response()->json(['error' => 'Unauthorized access.'], 403);
        }

        $activeEngine = Setting::where('key', 'ocr_engine')->value('value') ?? 'gemini';
        $activeModel = Setting::where('key', 'ollama_model')->value('value') ?? 'qwen2.5vl:3b';

        // Check local Ollama status
        $ollamaOnline = false;
        $ollamaModels = [];
        try {
            $ollamaRes = \Illuminate\Support\Facades\Http::timeout(3)->get('http://127.0.0.1:11434/api/tags');
            if ($ollamaRes->successful()) {
                $ollamaOnline = true;
                $data = $ollamaRes->json();
                if (isset($data['models']) && is_array($data['models'])) {
                    foreach ($data['models'] as $m) {
                        if (!empty($m['name'])) {
                            $ollamaModels[] = $m['name'];
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            $ollamaOnline = false;
        }

        // Check Gemini API Keys
        $geminiKeyCount = 0;
        $keysStr = env('GEMINI_API_KEYS') ?? env('GEMINI_API_KEY') ?? '';
        if ($keysStr) {
            $geminiKeyCount = count(array_filter(explode(',', $keysStr)));
        }

        return response()->json([
            'success' => true,
            'active_engine' => $activeEngine,
            'active_model' => $activeModel,
            'ollama' => [
                'online' => $ollamaOnline,
                'models' => array_values($ollamaModels),
                'has_qwen' => in_array('qwen2.5vl:3b', $ollamaModels) || in_array('qwen2.5vl:latest', $ollamaModels),
            ],
            'gemini' => [
                'has_keys' => $geminiKeyCount > 0,
                'key_count' => $geminiKeyCount,
            ]
        ]);
    }
}
