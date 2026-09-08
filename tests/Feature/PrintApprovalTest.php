<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Represents the Print Approval Test application component.
 */
class PrintApprovalTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Executes the test_staff_can_request_print_approval operation.
     */
    public function test_staff_can_request_print_approval()
    {
        // 1. Create a staff user (e.g. role = Staff or Admin)
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'User',
            'email' => 'staff@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create an active issuance record
        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0001',
            'type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Request print approval with session
        $response = $this->withSession(['user_id' => $staffId])
                         ->postJson("/api/issuances/{$issuanceId}/request-print", [
                             'or_number' => 'OR-12345',
                             'print_remarks' => 'In-person urgent copy request',
                         ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // 4. Assert DB state changed
        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Pending Approval', $record->status);
        $this->assertEquals('OR-12345', $record->or_number);
        $this->assertEquals('In-person urgent copy request', $record->print_remarks);
        $this->assertEquals('Staff User', $record->requested_by);
    }

    /**
     * Executes the test_regular_staff_cannot_approve_print_request operation.
     */
    public function test_regular_staff_cannot_approve_print_request()
    {
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'User',
            'email' => 'staff@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0001',
            'type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Pending Approval',
            'or_number' => 'OR-12345',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Try to approve as Staff
        $response = $this->withSession(['user_id' => $staffId])
                         ->postJson("/api/issuances/{$issuanceId}/approve-print");

        $response->assertStatus(403); // Forbidden
        
        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Pending Approval', $record->status);
    }

    /**
     * Executes the test_super_admin_can_approve_print_request operation.
     */
    public function test_super_admin_can_approve_print_request()
    {
        $superAdminId = DB::table('users')->insertGetId([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'SuperAdmin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0001',
            'type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Pending Approval',
            'or_number' => 'OR-12345',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Approve as SuperAdmin
        $response = $this->withSession(['user_id' => $superAdminId])
                         ->postJson("/api/issuances/{$issuanceId}/approve-print");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Approved', $record->status);
        $this->assertEquals('Super Admin', $record->approved_by);
    }

    /**
     * Executes the test_super_admin_can_reject_print_request operation.
     */
    public function test_super_admin_can_reject_print_request()
    {
        $superAdminId = DB::table('users')->insertGetId([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'SuperAdmin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0001',
            'type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Pending Approval',
            'or_number' => 'OR-12345',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Reject as SuperAdmin
        $response = $this->withSession(['user_id' => $superAdminId])
                         ->postJson("/api/issuances/{$issuanceId}/reject-print");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Active', $record->status);
    }

    /**
     * Executes the test_issuing_approved_document_transitions_status operation.
     */
    public function test_issuing_approved_document_transitions_status()
    {
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'User',
            'email' => 'staff@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0001',
            'type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Mark as issued
        $response = $this->withSession(['user_id' => $staffId])
                         ->postJson("/api/issuances/{$issuanceId}/issue");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Issued', $record->status);
        $this->assertEquals('Staff User', $record->encoded_by);
    }

    /**
     * Executes the test_staff_can_request_print_approval_without_or_number_generates_automatic_or operation.
     */
    public function test_staff_can_request_print_approval_without_or_number_generates_automatic_or()
    {
        // 1. Create a staff user
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'User',
            'email' => 'staff_auto@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create an active issuance record
        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2026-0002',
            'type' => 'birth',
            'name' => 'Maria Dela Cruz',
            'barangay' => 'Labac',
            'issuanceDate' => '05/26/2026',
            'status' => 'Active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Request print approval without or_number
        $response = $this->withSession(['user_id' => $staffId])
                         ->postJson("/api/issuances/{$issuanceId}/request-print", [
                             'print_remarks' => 'In-person urgent copy request',
                         ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // 4. Assert DB state changed and OR number is generated
        $record = DB::table('issuances')->where('id', $issuanceId)->first();
        $this->assertEquals('Pending Approval', $record->status);
        $this->assertNotEmpty($record->or_number);
        $this->assertStringStartsWith('OR-', $record->or_number);
        $this->assertEquals('In-person urgent copy request', $record->print_remarks);
        $this->assertEquals('Staff User', $record->requested_by);
    }

    /**
     * Executes the test_dashboard_stats_total_issued_files_only_counts_issued_status operation.
     */
    public function test_dashboard_stats_total_issued_files_only_counts_issued_status()
    {
        // 1. Create a staff user
        $staffId = DB::table('users')->insertGetId([
            'first_name' => 'Staff',
            'last_name' => 'User',
            'email' => 'staff_dashboard@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create multiple issuance records with different statuses
        DB::table('issuances')->insert([
            [
                'certNumber' => 'BC-2026-1001',
                'type' => 'birth',
                'name' => 'Issued Certificate',
                'barangay' => 'Labac',
                'issuanceDate' => '05/26/2026',
                'status' => 'Issued',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'certNumber' => 'BC-2026-1002',
                'type' => 'birth',
                'name' => 'Pending Certificate',
                'barangay' => 'Labac',
                'issuanceDate' => '05/26/2026',
                'status' => 'Pending Approval',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'certNumber' => 'BC-2026-1003',
                'type' => 'birth',
                'name' => 'Approved Certificate',
                'barangay' => 'Labac',
                'issuanceDate' => '05/26/2026',
                'status' => 'Approved',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'certNumber' => 'BC-2026-1004',
                'type' => 'birth',
                'name' => 'Active Certificate',
                'barangay' => 'Labac',
                'issuanceDate' => '05/26/2026',
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);

        // 3. Fetch dashboard stats
        $response = $this->withSession(['user_id' => $staffId])
                         ->getJson("/api/dashboard/stats");

        $response->assertStatus(200);
        
        // 4. Assert that totalIssuances is exactly 1 (only the 'Issued' one)
        $data = $response->json();
        $this->assertEquals(1, $data['stats']['totalIssuances']);
    }
}
