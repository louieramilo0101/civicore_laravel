<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

/**
 * Represents the Auth Controller application component.
 */
class AuthController extends Controller
{
    /**
     * Login
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $user = User::where('email', $request->input('email'))->first();

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        // Store user in session
        $request->session()->put('user_id', $user->id);

        return response()->json([
            'success' => true,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * Return current session user
     */
    public function session(Request $request)
    {
        $userId = $request->session()->get('user_id');

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'No active session.'], 401);
        }

        $user = User::find($userId);

        if (!$user) {
            $request->session()->forget('user_id');
            return response()->json(['success' => false, 'message' => 'User not found.'], 401);
        }

        return response()->json([
            'success' => true,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $request->session()->forget('user_id');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId'          => 'required|integer',
            'currentPassword' => 'required|string',
            'newPassword'     => 'required|string|min:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 400);
        }

        $sessionUserId = $request->session()->get('user_id');
        $targetId      = (int) $request->input('userId');
        $sessionUser   = User::find($sessionUserId);

        // Only SuperAdmin can change another user's password
        if ($sessionUser?->role !== 'SuperAdmin' && $sessionUserId !== $targetId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $user = User::find($targetId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 404);
        }

        // If user is changing their OWN password, verify current password.
        // If SuperAdmin is changing another user's password, allow direct reset.
        if ($sessionUserId === $targetId) {
            if (!Hash::check($request->input('currentPassword'), $user->password)) {
                return response()->json(['success' => false, 'message' => 'Current password is incorrect.'], 401);
            }
        }

        $user->password = Hash::make($request->input('newPassword'));
        $user->save();

        return response()->json(['success' => true, 'message' => 'Password changed successfully.']);
    }

    /**
     * Verify password
     */
    public function verifyPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId'   => 'required|integer',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 400);
        }

        $user = User::find($request->input('userId'));
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 404);
        }

        if (!Hash::check($request->input('password'), $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid password.'], 401);
        }

        return response()->json(['success' => true, 'message' => 'Password verified.']);
    }

    /**
     * Format user for JSON response (exclude sensitive fields)
     */
    private function formatUser(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'first_name'  => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name'   => $user->last_name,
            'email'       => $user->email,
            'role'        => $user->role,
            'avatar'      => $user->avatar ? 'data:image/png;base64,' . base64_encode($user->avatar) : null,
            'permissions' => $user->permissions ?? [],
            'created_at'  => $user->created_at,
        ];
    }
}
