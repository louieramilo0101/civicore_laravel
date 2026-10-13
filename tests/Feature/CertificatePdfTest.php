<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Services\CertificatePdfGeneratorService;

class CertificatePdfTest extends TestCase
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

    public function test_manual_entry_creates_pdf_and_searchable_metadata(): void
    {
        $response = $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'extracted_fields' => [
                    'first_name' => 'Maria',
                    'middle_name' => 'Santos',
                    'last_name' => 'Cruz',
                    'sex' => 'Female',
                    'dob_month' => 'May',
                    'dob_day' => 15,
                    'dob_year' => 2002,
                    'province' => 'Cavite',
                    'city_municipality' => 'Naic',
                    'barangay' => 'San Roque',
                    'registry_number' => 'BC-2002-99881',
                ]
            ]);

        $response->assertStatus(200);

        // Verify document record
        $doc = DB::table('documents')->where('personName', 'CRUZ, MARIA SANTOS')->first();
        $this->assertNotNull($doc);
        $this->assertNotNull($doc->file_path);
        $this->assertStringContainsString('documents/cert_birth_', $doc->file_path);
        $this->assertStringContainsString('Maria', $doc->raw_text);
        $this->assertStringContainsString('BC-2002-99881', $doc->ocr_text);

        // Verify issuance record
        $issuance = DB::table('issuances')->where('document_id', $doc->id)->first();
        $this->assertNotNull($issuance);
        $this->assertNotNull($issuance->file_path);

        // Verify serving document returns PDF (not 404 error)
        $viewDocResponse = $this->withSession(['user_id' => $this->adminId])
            ->get("/api/documents/view/{$doc->id}");
        $viewDocResponse->assertStatus(200);
        $this->assertEquals('application/pdf', $viewDocResponse->headers->get('content-type'));

        // Verify serving issuance returns PDF (not 404 error)
        $viewIssuanceResponse = $this->withSession(['user_id' => $this->adminId])
            ->get("/api/issuances/view/{$issuance->id}");
        $viewIssuanceResponse->assertStatus(200);
        $this->assertEquals('application/pdf', $viewIssuanceResponse->headers->get('content-type'));
    }

    public function test_issuance_view_auto_generates_pdf_if_file_was_missing(): void
    {
        // Insert an issuance with NO document_id and NO source file on disk
        $issuanceId = DB::table('issuances')->insertGetId([
            'certNumber' => 'BC-2024-001',
            'type' => 'birth',
            'certificate_type' => 'birth',
            'name' => 'Juan Dela Cruz',
            'barangay' => 'Muzon',
            'issuanceDate' => '09/22/2026',
            'status' => 'Active',
            'extracted_data' => json_encode([
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'registry_number' => 'BC-2024-001',
                'province' => 'Cavite',
                'city_municipality' => 'Naic',
                'barangay' => 'Muzon',
            ]),
            'file_path' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempt viewing this issuance - should generate PDF on the fly and return 200 application/pdf!
        $response = $this->withSession(['user_id' => $this->adminId])
            ->get("/api/issuances/view/{$issuanceId}");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }

    public function test_search_finds_record_by_extracted_metadata(): void
    {
        $this->withSession(['user_id' => $this->adminId])
            ->postJson('/api/documents/manual', [
                'type' => 'birth',
                'extracted_fields' => [
                    'first_name' => 'UniqueBabyName',
                    'last_name' => 'TestFamily',
                    'dob_month' => 'March',
                    'dob_day' => 10,
                    'dob_year' => 2021,
                    'province' => 'Cavite',
                    'city_municipality' => 'Naic',
                    'barangay' => 'Halang',
                    'registry_number' => 'BC-SPECIAL-777',
                ]
            ]);

        // Search in issuances by the special registry number
        $searchResponse = $this->withSession(['user_id' => $this->adminId])
            ->getJson('/api/issuances?search=BC-SPECIAL-777');

        $searchResponse->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $searchResponse->json('meta.total'));
        $this->assertEquals('TESTFAMILY, UNIQUEBABYNAME', $searchResponse->json('data.0.name'));
    }
}
