<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentValidationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_admin_can_access_documents operation.
     */
    public function test_admin_can_access_documents()
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

        // Access documents index with Admin session
        $response = $this->withSession(['user_id' => $adminId])
                         ->getJson('/api/documents');

        $response->assertStatus(200);
    }

    /**
     * Executes the test_staff_can_access_documents operation.
     */
    public function test_staff_can_access_documents()
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

        // Access documents index with Staff session
        $response = $this->withSession(['user_id' => $staffId])
                         ->getJson('/api/documents');

        $response->assertStatus(200);
    }
}