<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $users = DB::select("SELECT * FROM users WHERE email = ? AND password = ?", [$email, $password]);

        if (count($users) > 0) {
            $user = $users[0];
            
            // Parse permissions from JSON string to array
            $user->permissions = $this->parsePermissions($user->permissions ?? null);
            
            // Store user in session
            $request->session()->put('user', $user);
            
            return response()->json(['success' => true, 'user' => $user]);
        } else {
            return response()->json(['success' => false, 'message' => 'Invalid email or password'], 401);
        }
    }

    /**
     * Check session
     */
    public function session(Request $request)
    {
        if ($request->session()->has('user')) {
            $userId = $request->session()->get('user')->id;
            
            // Always fetch fresh user data from database
            $users = DB::select("SELECT * FROM users WHERE id = ?", [$userId]);
            
            if (count($users) === 0) {
                $request->session()->forget('user');
                return response()->json(['success' => false, 'message' => 'User not found'], 401);
            }
            
            $freshUser = $users[0];
            $freshUser->permissions = $this->parsePermissions($freshUser->permissions ?? null);
            
            // Update session with fresh data
            $request->session()->put('user', $freshUser);
            
            return response()->json([
                'success' => true,
                'user' => $freshUser,
                'sessionId' => $request->session()->getId()
            ]);
        }
        
        return response()->json(['success' => false, 'message' => 'No active session'], 401);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->session()->forget('user');
        $request->session()->invalidate();
        
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId' => 'required|integer',
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $userId = $request->input('userId');
        $currentPassword = $request->input('currentPassword');
        $newPassword = $request->input('newPassword');

        $users = DB::select("SELECT * FROM users WHERE id = ? AND password = ?", [$userId, $currentPassword]);

        if (count($users) === 0) {
            return response()->json(['success' => false, 'message' => 'Current password is incorrect'], 401);
        }

        DB::update("UPDATE users SET password = ? WHERE id = ?", [$newPassword, $userId]);

        return response()->json(['success' => true, 'message' => 'Password changed successfully!']);
    }

    /**
     * Verify password
     */
    public function verifyPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId' => 'required|integer',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $userId = $request->input('userId');
        $password = $request->input('password');

        $users = DB::select("SELECT * FROM users WHERE id = ? AND password = ?", [$userId, $password]);

        if (count($users) === 0) {
            return response()->json(['success' => false, 'message' => 'Invalid password'], 401);
        }

        return response()->json(['success' => true, 'message' => 'Password verified']);
    }

    /**
     * Parse permissions from JSON string
     */
    private function parsePermissions($permissions)
    {
        if (empty($permissions)) {
            return [];
        }

        if (is_array($permissions)) {
            return $permissions;
        }

        if (is_object($permissions)) {
            return json_decode(json_encode($permissions), true);
        }

        try {
            return json_decode($permissions, true);
        } catch (\Exception $e) {
            return [];
        }
    }
}
