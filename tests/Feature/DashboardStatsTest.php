<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_admin_can_view_dashboard_stats operation.
     */
    public function test_admin_can_view_dashboard_stats()
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

        // Access dashboard stats with Admin session (formerly SuperAdmin-only)
        $response = $this->withSession(['user_id' => $adminId])
                         ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
    }
}