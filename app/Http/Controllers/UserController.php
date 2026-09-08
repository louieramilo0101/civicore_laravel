<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

/**
 * Represents the User Controller application component.
 */
class UserController extends Controller
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Get the authenticated user from session, or abort with 401.
     */
    private function sessionUser(Request $request): ?User
    {
        $userId = $request->session()->get('user_id');
        return $userId ? User::find($userId) : null;
    }

    // ─── List users ───────────────────────────────────────────────────────────

    /**
     * GET /api/users
     * Admin  → all users (with optional search + pagination)
     * Others → only their own record
     */
    public function index(Request $request)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($actor->role !== 'SuperAdmin') {
            // Non-admins only see themselves
            return response()->json([
                'data' => [$this->formatUser($actor)],
                'meta' => ['current_page' => 1, 'per_page' => 1, 'total' => 1, 'last_page' => 1],
            ]);
        }

        // Admin: paginated + searchable list
        $page    = max(1, (int) $request->query('page', 1));
        $perPage = min((int) $request->query('per_page', 20), 100);
        $search  = $request->query('search', '');

        $query = User::query()->orderByDesc('id');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginated->map(fn($u) => $this->formatUser($u)),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
                'last_page'    => $paginated->lastPage(),
            ],
        ]);
    }

    // ─── Single user ──────────────────────────────────────────────────────────

    /**
     * GET /api/users/{id}
     * Admin → any user | Staff/User → only self
     */
    public function show(Request $request, $id)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($actor->role !== 'SuperAdmin' && $actor->id != $id) {
            return response()->json(['error' => 'Forbidden.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        return response()->json($this->formatUser($user));
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    /**
     * POST /api/users  |  POST /api/create-account
     * Admin only
     */
    public function store(Request $request)
    {
        return $this->createUser($request);
    }

    /**
     * Executes the create account operation.
     */
    public function createAccount(Request $request)
    {
        return $this->createUser($request);
    }

    /**
     * Executes the create user operation.
     */
    private function createUser(Request $request)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($actor->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Only SuperAdmins can create accounts.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'middle_name'=> ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'last_name'  => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:7',
            'role'       => 'required|in:Admin,SuperAdmin',
            'avatar'     => 'nullable|string',
        ], [
            'first_name.regex'  => 'First name cannot contain numbers or invalid special characters.',
            'middle_name.regex' => 'Middle name cannot contain numbers or invalid special characters.',
            'last_name.regex'   => 'Last name cannot contain numbers or invalid special characters.',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $avatarBinary = null;
        if ($request->has('avatar')) {
            $avatarData = $request->input('avatar');
            if ($avatarData) {
                if (strpos($avatarData, 'data:image') === 0) {
                    $avatarData = substr($avatarData, strpos($avatarData, ',') + 1);
                }
                $avatarBinary = base64_decode($avatarData);
            }
        }

        $user = User::create([
            'first_name' => $request->input('first_name'),
            'middle_name'=> $request->input('middle_name'),
            'last_name'  => $request->input('last_name'),
            'email'      => $request->input('email'),
            'password'   => Hash::make($request->input('password')),
            'role'       => $request->input('role'),
        ]);

        if ($avatarBinary !== null) {
            $user->avatar = $avatarBinary;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully.',
            'user'    => $this->formatUser($user),
        ], 201);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    /**
     * PUT /api/users/{id}
     * Admin → can update role + full profile of anyone
     * Staff/User → cannot use this endpoint (use updateProfile for own data)
     */
    public function update(Request $request, $id)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($actor->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Only SuperAdmins can change roles.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|in:Admin,SuperAdmin',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        $user->role = $request->input('role');
        $user->save();

        return response()->json(['success' => true, 'user' => $this->formatUser($user)]);
    }

    /**
     * PUT /api/users/{id}/profile
     * Admin → any user | Staff/User → only self
     */
    public function updateProfile(Request $request, $id)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        // Only SuperAdmin can edit others. Non-admins only themselves.
        if ($actor->role !== 'SuperAdmin' && $actor->id != $id) {
            return response()->json(['error' => 'Forbidden.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        // Validation Rules
        $rules = [
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'middle_name'=> ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'last_name'  => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'avatar'     => 'nullable|string', // Base64 expected
        ];

        // Only SuperAdmin can change email and role
        if ($actor->role === 'SuperAdmin') {
            $rules['email'] = 'required|email|unique:users,email,' . $id;
            $rules['role']  = 'required|in:Admin,SuperAdmin';
        }

        $validator = Validator::make($request->all(), $rules, [
            'first_name.regex'  => 'First name cannot contain numbers or invalid special characters.',
            'middle_name.regex' => 'Middle name cannot contain numbers or invalid special characters.',
            'last_name.regex'   => 'Last name cannot contain numbers or invalid special characters.',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        // Apply changes
        $user->first_name  = $request->input('first_name');
        $user->middle_name = $request->input('middle_name');
        $user->last_name   = $request->input('last_name');
        
        if ($actor->role === 'SuperAdmin') {
            $user->email = $request->input('email');
            $user->role  = $request->input('role');
        }

        // Handle Avatar (Base64 -> Binary BLOB)
        if ($request->has('avatar')) {
            $avatarData = $request->input('avatar');
            if ($avatarData) {
                // If it's a data URL, strip the header
                if (strpos($avatarData, 'data:image') === 0) {
                    $avatarData = substr($avatarData, strpos($avatarData, ',') + 1);
                }
                $user->avatar = base64_decode($avatarData);
            } else {
                $user->avatar = null;
            }
        }

        $user->save();

        return response()->json([
            'success' => true, 
            'message' => 'Profile updated successfully.', 
            'user'    => $this->formatUser($user)
        ]);
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    /**
     * DELETE /api/users/{id}
     * Admin → any user | Staff/User → only self
     */
    public function destroy(Request $request, $id)
    {
        $actor = $this->sessionUser($request);
        if (!$actor) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($actor->role !== 'SuperAdmin' && $actor->id != $id) {
            return response()->json(['error' => 'Forbidden.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        $user->delete();

        return response()->json(['success' => true, 'message' => 'Account deleted.']);
    }

    // ─── Format ───────────────────────────────────────────────────────────────

    /**
     * Executes the format user operation.
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
