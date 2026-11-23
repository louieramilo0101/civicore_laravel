<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_admin_can_generate_certificate operation.
     */
    public function test_admin_can_generate_certificate()
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

        // Access certificate generation with Admin session (formerly SuperAdmin-only)
        $response = $this->withSession(['user_id' => $adminId])
                         ->getJson('/api/certificates/generate');

        $response->assertStatus(200);
    }
}