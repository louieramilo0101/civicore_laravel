<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

/**
 * Represents the Announcement Controller application component.
 */
class AnnouncementController extends Controller
{
    /**
     * Auth check for Admins
     */
    private function checkAdmin(Request $request)
    {
        $userId = $request->session()->get('user_id');
        $actor = $userId ? User::find($userId) : null;
        if (!$actor || !in_array($actor->role, ['Admin', 'SuperAdmin'])) {
            return false;
        }
        return true;
    }

    /**
     * Executes the index operation.
     */
    public function index()
    {
        try {
            return response()->json(Announcement::orderBy('created_at', 'desc')->get());
        } catch (\Exception $e) {
            \Log::error('Announcements load failure: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Executes the store operation.
     */
    public function store(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:1000',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $announcement = Announcement::create([
            'message' => $request->input('message'),
            'is_active' => $request->input('is_active', true),
        ]);

        $userId = $request->session()->get('user_id');
        $actor = $userId ? User::find($userId) : null;
        $actorName = $actor ? $actor->name : 'System';

        DB::table('activity_logs')->insert([
            'user_name' => $actorName,
            'action' => 'Created Announcement',
            'record_type' => 'Announcement',
            'record_id' => $announcement->id,
            'details' => 'Created announcement: ' . $announcement->message,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'announcement' => $announcement]);
    }

    /**
     * Executes the update operation.
     */
    public function update(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'sometimes|required|string|max:1000',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $announcement = Announcement::findOrFail($id);
        
        if ($request->has('message')) {
            $announcement->message = $request->input('message');
        }
        if ($request->has('is_active')) {
            $announcement->is_active = $request->input('is_active');
        }
        
        $announcement->save();

        $userId = $request->session()->get('user_id');
        $actor = $userId ? User::find($userId) : null;
        $actorName = $actor ? $actor->name : 'System';

        DB::table('activity_logs')->insert([
            'user_name' => $actorName,
            'action' => 'Updated Announcement',
            'record_type' => 'Announcement',
            'record_id' => $announcement->id,
            'details' => 'Updated announcement: ' . $announcement->message,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'announcement' => $announcement]);
    }

    /**
     * Executes the destroy operation.
     */
    public function destroy(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $announcement = Announcement::find($id);
        if ($announcement) {
            $message = $announcement->message;
            $announcement->delete();

            $userId = $request->session()->get('user_id');
            $actor = $userId ? User::find($userId) : null;
            $actorName = $actor ? $actor->name : 'System';

            DB::table('activity_logs')->insert([
                'user_name' => $actorName,
                'action' => 'Deleted Announcement',
                'record_type' => 'Announcement',
                'record_id' => $id,
                'details' => 'Deleted announcement: ' . $message,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['success' => true]);
    }
}
