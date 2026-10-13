<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ManualRegistrationDuplicateTest extends TestCase
{
    use RefreshDatabase;

    protected int $adminId;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

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

    public function test_manual_registration_in_dummy_mode_saves_without_file(): void
    {
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'DummyFirst',
                    'last_name' => 'DummyLast',
                    'dob_month' => 'May',
                    'dob_day' => 15,
                    'dob_year' => 2020,
                    'barangay' => 'San Roque',
                    'registry_number' => 'DUMMY-BIRTH-001',
                ]
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'type' => 'birth',
            'personName' => 'DUMMYLAST, DUMMYFIRST',
        ]);
        $this->assertDatabaseHas('issuances', [
            'type' => 'birth',
            'certNumber' => 'DUMMY-BIRTH-001',
        ]);
    }

    public function test_manual_registration_with_uploaded_file_attaches_document(): void
    {
        $fakeImage = UploadedFile::fake()->image('certificate_scan.jpg', 800, 1000);

        $response = $this->withSession(['user_id' => $this->adminId])
            ->post('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => false,
                'file' => $fakeImage,
                'extracted_fields' => json_encode([
                    'first_name' => 'RealFirst',
                    'last_name' => 'RealLast',
                    'dob_month' => 'June',
                    'dob_day' => 20,
                    'dob_year' => 2019,
                    'barangay' => 'Halang',
                    'registry_number' => 'REAL-BIRTH-999',
                ])
            ]);

        $response->assertStatus(200);
        $doc = DB::table('documents')->where('personName', 'REALLAST, REALFIRST')->first();
        $this->assertNotNull($doc);
        $this->assertNotNull($doc->file_path);
        $this->assertNotNull($doc->image_path);
        $this->assertEquals('certificate_scan.jpg', $doc->name);

        $issuance = DB::table('issuances')->where('certNumber', 'REAL-BIRTH-999')->first();
        $this->assertNotNull($issuance);
        $this->assertEquals('Halang', $issuance->barangay);
    }

    public function test_duplicate_registry_number_in_same_type_is_rejected(): void
    {
        // First, register a birth record
        $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'OriginalPerson',
                    'last_name' => 'Santos',
                    'dob_month' => 'January',
                    'dob_day' => 1,
                    'dob_year' => 2000,
                    'barangay' => 'San Roque',
                    'registry_number' => 'REG-UNIQUE-101',
                ]
            ])->assertStatus(200);

        // Attempt to register another record with the SAME registry number in birth
        $duplicateResponse = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'DifferentPerson',
                    'last_name' => 'Dela Cruz',
                    'dob_month' => 'July',
                    'dob_day' => 12,
                    'dob_year' => 2005,
                    'barangay' => 'Mabolo',
                    'registry_number' => 'REG-UNIQUE-101',
                ]
            ]);

        $duplicateResponse->assertStatus(422);
        $duplicateResponse->assertJson([
            'success' => false,
            'duplicate' => true,
        ]);
        $this->assertStringContainsString('REG-UNIQUE-101', $duplicateResponse->json('error'));
    }

    public function test_same_registry_number_in_different_certificate_type_is_accepted(): void
    {
        // Register a Birth record with REG-CROSS-555
        $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'BabyName',
                    'last_name' => 'Garcia',
                    'dob_month' => 'March',
                    'dob_day' => 5,
                    'dob_year' => 2021,
                    'barangay' => 'San Roque',
                    'registry_number' => 'REG-CROSS-555',
                ]
            ])->assertStatus(200);

        // Register a Death record with the same registry number (different type: death)
        $deathResponse = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'death',
                'is_dummy' => true,
                'extracted_fields' => [
                    'deceased_first_name' => 'ElderName',
                    'deceased_last_name' => 'Mendoza',
                    'dod_month' => 'April',
                    'dod_day' => 10,
                    'dod_year' => 2023,
                    'barangay' => 'Labac',
                    'registry_number' => 'REG-CROSS-555',
                ]
            ]);

        $deathResponse->assertStatus(200);
        $this->assertDatabaseHas('issuances', [
            'type' => 'death',
            'certNumber' => 'REG-CROSS-555',
        ]);
    }

    public function test_same_person_name_with_different_registry_numbers_is_not_duplicate(): void
    {
        // First Juan Dela Cruz
        $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'Juan',
                    'last_name' => 'Dela Cruz',
                    'dob_month' => 'August',
                    'dob_day' => 20,
                    'dob_year' => 1995,
                    'barangay' => 'San Roque',
                    'registry_number' => 'JUAN-001',
                ]
            ])->assertStatus(200);

        // Second Juan Dela Cruz with different registry number
        $secondJuan = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'Juan',
                    'last_name' => 'Dela Cruz',
                    'dob_month' => 'August',
                    'dob_day' => 20,
                    'dob_year' => 1995,
                    'barangay' => 'San Roque',
                    'registry_number' => 'JUAN-002',
                ]
            ]);

        $secondJuan->assertStatus(200);
    }

    public function test_force_override_allows_duplicate_registry_number(): void
    {
        $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'extracted_fields' => [
                    'first_name' => 'FirstOne',
                    'last_name' => 'Override',
                    'dob_month' => 'January',
                    'dob_day' => 1,
                    'dob_year' => 2000,
                    'barangay' => 'San Roque',
                    'registry_number' => 'OVERRIDE-123',
                ]
            ])->assertStatus(200);

        // Force duplicate save
        $overrideResponse = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'is_dummy' => true,
                'force' => true,
                'extracted_fields' => [
                    'first_name' => 'SecondOne',
                    'last_name' => 'Override',
                    'dob_month' => 'February',
                    'dob_day' => 2,
                    'dob_year' => 2002,
                    'barangay' => 'Halang',
                    'registry_number' => 'OVERRIDE-123',
                ]
            ]);

        $overrideResponse->assertStatus(200);
    }
}
