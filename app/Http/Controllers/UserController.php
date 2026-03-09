<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Get all users
     */
    public function index()
    {
        $users = DB::select("SELECT * FROM users ORDER BY id DESC");
        
        foreach ($users as $user) {
            $user->permissions = $this->parsePermissions($user->permissions ?? null);
        }
        
        return response()->json($users);
    }

    /**
     * Get single user
     */
    public function show($id)
    {
        $users = DB::select("SELECT * FROM users WHERE id = ?", [$id]);
        
        if (count($users) === 0) {
            return response()->json(['error' => 'Not found'], 404);
        }
        
        $user = $users[0];
        $user->permissions = $this->parsePermissions($user->permissions ?? null);
        
        return response()->json($user);
    }

    /**
     * Create new user
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string',
            'role' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password');
        $role = $request->input('role');

        // Assign permissions based on role
        $permissions = $this->getPermissionsByRole($role);

        DB::insert("INSERT INTO users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)", 
            [$name, $email, $password, $role, json_encode($permissions)]);

        return response()->json(['success' => true, 'message' => 'User created successfully!']);
    }

    /**
     * Create account (Super Admin only)
     */
    public function createAccount(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'password' => 'required|string',
            'role' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password');
        $role = $request->input('role');

        // Assign permissions based on role
        $permissions = $this->getPermissionsByRole($role);

        DB::insert("INSERT INTO users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)", 
            [$name, $email, $password, $role, json_encode($permissions)]);

        return response()->json(['success' => true, 'message' => 'Account created successfully!']);
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        $role = $request->input('role');
        $permissions = $request->input('permissions');

        // Automatically assign correct permissions based on role
        $updatedPermissions = $this->getPermissionsByRole($role, $permissions);

        DB::update("UPDATE users SET role = ?, permissions = ? WHERE id = ?", 
            [$role, json_encode($updatedPermissions), $id]);

        return response()->json(['success' => true]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $name = $request->input('name');
        $email = $request->input('email');

        DB::update("UPDATE users SET name = ?, email = ? WHERE id = ?", [$name, $email, $id]);

        return response()->json(['success' => true, 'message' => 'Profile updated successfully!']);
    }

    /**
     * Delete user
     */
    public function destroy($id)
    {
        DB::delete("DELETE FROM users WHERE id = ?", [$id]);
        
        return response()->json(['success' => true]);
    }

    /**
     * Get permissions by role
     */
    private function getPermissionsByRole($role, $customPermissions = null)
    {
        if ($customPermissions !== null && !empty($customPermissions)) {
            return $customPermissions;
        }

        switch ($role) {
            case 'Super Admin':
                return ["View Dashboard", "Upload Documents", "Manage Users", "Edit Permissions", "Mapping Analytics"];
            case 'Admin':
                return ["View Dashboard", "Upload Documents", "Mapping Analytics", "View Reports"];
            case 'User':
                return ["View Dashboard", "View Services"];
            default:
                return ["View Dashboard", "View Services"];
        }
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
