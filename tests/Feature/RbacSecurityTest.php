<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Represents the Rbac Security Test application component.
 */
class RbacSecurityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_guest_cannot_access_protected_routes operation.
     */
    public function test_guest_cannot_access_protected_routes()
    {
        // Try to access a protected session route (e.g. list documents)
        $response = $this->getJson('/api/documents');

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Unauthenticated.']);
    }

    /**
     * Executes the test_admin_cannot_access_super_admin_routes operation.
     */
    public function test_admin_cannot_access_super_admin_routes()
    {
        // Create an Admin user (valid database role)
        $adminId = DB::table('users')->insertGetId([
            'first_name' => 'Admin',
            'last_name' => 'Officer',
            'email' => 'admin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Access SuperAdmin-only route (e.g. create account) with Admin session
        $response = $this->withSession(['user_id' => $adminId])
                         ->postJson('/api/users', []);

        $response->assertStatus(403);
        $response->assertJson(['error' => 'Forbidden.']);
    }

    /**
     * Executes the test_super_admin_can_access_super_admin_routes operation.
     */
    public function test_super_admin_can_access_super_admin_routes()
    {
        // Create a SuperAdmin user (valid database role)
        $superAdminId = DB::table('users')->insertGetId([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'SuperAdmin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Access SuperAdmin route with SuperAdmin session
        $response = $this->withSession(['user_id' => $superAdminId])
                         ->postJson('/api/users', []);

        // Bypasses 403 security and hits controller validation, returning 400 Bad Request
        $response->assertStatus(400);
    }
}
