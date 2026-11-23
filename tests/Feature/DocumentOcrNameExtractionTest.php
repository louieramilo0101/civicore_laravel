<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentOcrNameExtractionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_admin_can_access_ocr operation.
     */
    public function test_admin_can_access_ocr()
    {
        // Create an Admin user (formerly SuperAdmin - now has Admin role)
        $adminId = DB::table('users')->insertGetId([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Access OCR status with Admin session (requires admin middleware)
        $response = $this->withSession(['user_id' => $adminId])
                         ->getJson('/api/settings/ocr-status');

        // Admin can access OCR status
        $response->assertStatus(200);
    }

    /**
     * Executes the test_staff_cannot_access_admin_routes operation.
     */
    public function test_staff_cannot_access_admin_routes()
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

        // Staff cannot access admin routes (OCR status requires admin middleware)
        $response = $this->withSession(['user_id' => $staffId])
                         ->getJson('/api/settings/ocr-status');

        $response->assertStatus(403);
    }
}