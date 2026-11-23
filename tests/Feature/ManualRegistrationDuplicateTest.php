<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ManualRegistrationDuplicateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_admin_can_access_users operation.
     */
    public function test_admin_can_access_users()
    {
        // Create an Admin user (formerly Admin role)
        $adminId = DB::table('users')->insertGetId([
            'first_name' => 'Admin',
            'last_name' => 'Officer',
            'email' => 'admin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Access users list with Admin session
        $response = $this->withSession(['user_id' => $adminId])
                         ->getJson('/api/users');

        $response->assertStatus(200);
    }

    /**
     * Executes the test_staff_can_access_own_user operation.
     */
    public function test_staff_can_access_own_user()
    {
        // Create a Staff user
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'Officer',
            'email' => 'staff@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Staff',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Staff can only access their own user record
        $response = $this->withSession(['user_id' => $staffId])
                         ->getJson('/api/users');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('meta.total'));
    }
}