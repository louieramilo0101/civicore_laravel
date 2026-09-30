<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentValidationTest extends TestCase
{
    use RefreshDatabase;

    protected int $adminId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminId = DB::table('users')->insertGetId([
            'first_name' => 'Admin',
            'last_name' => 'Officer',
            'email' => 'admin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_rejects_invalid_day_in_manual_entry(): void
    {
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'extracted_fields' => [
                    'first_name' => 'John',
                    'last_name' => 'Doe',
                    'dob_month' => 'January',
                    'dob_day' => 35, // Invalid day!
                    'dob_year' => 2000,
                    'barangay' => 'San Roque'
                ]
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Day must be between 1 and 31', $response->json('error'));
    }

    public function test_rejects_invalid_february_date(): void
    {
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'extracted_fields' => [
                    'first_name' => 'John',
                    'last_name' => 'Doe',
                    'dob_month' => 'February',
                    'dob_day' => 30, // Invalid for February!
                    'dob_year' => 2024,
                    'barangay' => 'San Roque'
                ]
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('February has at most', $response->json('error'));
    }

    public function test_rejects_future_date_for_marriage_or_death(): void
    {
        $futureDate = date('Y-m-d', strtotime('+1 year'));
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'marriage',
                'extracted_fields' => [
                    'husband_first_name' => 'John',
                    'husband_last_name' => 'Doe',
                    'wife_first_name' => 'Jane',
                    'wife_last_name' => 'Smith',
                    'date_of_marriage' => $futureDate, // Future date!
                    'barangay' => 'San Roque'
                ]
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('cannot be in the future', $response->json('error'));
    }

    public function test_accepts_valid_data_and_normalizes(): void
    {
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'extracted_fields' => [
                    'first_name' => 'John',
                    'last_name' => 'Doe',
                    'dob_month' => 'jan', // Will normalize to 'January'
                    'dob_day' => '15',
                    'dob_year' => '2000',
                    'barangay' => 'San Roque'
                ]
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'type' => 'birth',
            'personName' => 'DOE, JOHN'
        ]);
    }
}
