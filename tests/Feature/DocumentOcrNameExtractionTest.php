<?php

namespace Tests\Feature;

use App\Http\Controllers\DocumentController;
use App\Models\Document;
use App\Models\Issuance;
use App\Services\OcrParserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentOcrNameExtractionTest extends TestCase
{
    use RefreshDatabase;

    protected int $adminId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminId = DB::table('users')->insertGetId([
            'first_name' => 'SuperAdmin',
            'last_name' => 'Officer',
            'email' => 'admin@civicore.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'SuperAdmin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** Test that OcrParserService rejects JSON strings and never extracts JSON tokens. */
    public function test_ocr_parser_ignores_json_strings(): void
    {
        $parser = new OcrParserService();
        $jsonPayload = json_encode([
            'is_valid_document' => true,
            'husband_first_name' => 'SIMEON',
            'husband_middle_name' => null,
            'husband_last_name' => 'NORCIO',
            'wife_first_name' => 'LUCILA',
            'wife_middle_name' => null,
            'wife_last_name' => 'ALMANO',
        ]);

        $result = $parser->parseText($jsonPayload);
        $this->assertEmpty($result['extracted_fields']);
    }

    /** Test marriage name building with null middle names and suffix. */
    public function test_marriage_couple_name_formatting_without_json(): void
    {
        $controller = new DocumentController();
        $refMethod = new \ReflectionMethod(DocumentController::class, 'buildFullName');
        $refMethod->setAccessible(true);

        $fields = [
            'husband_first_name' => 'SIMEON',
            'husband_middle_name' => null,
            'husband_last_name' => 'NORCIO',
            'husband_suffix' => 'Jr.',
            'wife_first_name' => 'LUCILA',
            'wife_middle_name' => null,
            'wife_last_name' => 'ALMANO',
            'wife_suffix' => null,
        ];

        $fullName = $refMethod->invoke($controller, $fields, 'marriage');
        $this->assertEquals('NORCIO, SIMEON JR. & ALMANO, LUCILA', $fullName);
        $this->assertStringNotContainsString('{', $fullName);
        $this->assertStringNotContainsString('is_valid_document', $fullName);
    }

    /** Test that any field containing stringified JSON is purged from the full name. */
    public function test_build_full_name_strips_corrupted_json_input(): void
    {
        $controller = new DocumentController();
        $refMethod = new \ReflectionMethod(DocumentController::class, 'buildFullName');
        $refMethod->setAccessible(true);

        $corruptedFields = [
            'husband_first_name' => 'SIMEON',
            'husband_middle_name' => '{"is_valid_document": true, "some_key": "junk"}',
            'husband_last_name' => 'NORCIO',
            'husband_suffix' => 'Jr.',
            'wife_first_name' => 'LUCILA',
            'wife_middle_name' => '{"is_valid_document": true}',
            'wife_last_name' => 'ALMANO',
            'wife_suffix' => null,
        ];

        $fullName = $refMethod->invoke($controller, $corruptedFields, 'marriage');
        $this->assertEquals('NORCIO, SIMEON JR. & ALMANO, LUCILA', $fullName);
        $this->assertStringNotContainsString('{', $fullName);
        $this->assertStringNotContainsString('is_valid_document', $fullName);
    }

    /** Test birth certificate name building. */
    public function test_birth_child_name_formatting(): void
    {
        $controller = new DocumentController();
        $refMethod = new \ReflectionMethod(DocumentController::class, 'buildFullName');
        $refMethod->setAccessible(true);

        $fields = [
            'first_name' => 'VENTURA',
            'middle_name' => 'DAVID',
            'last_name' => 'ALAMARES',
            'suffix' => '',
        ];

        $fullName = $refMethod->invoke($controller, $fields, 'birth');
        $this->assertEquals('ALAMARES, VENTURA DAVID', $fullName);
    }

    /** Test death certificate name building. */
    public function test_death_deceased_name_formatting(): void
    {
        $controller = new DocumentController();
        $refMethod = new \ReflectionMethod(DocumentController::class, 'buildFullName');
        $refMethod->setAccessible(true);

        $fields = [
            'deceased_first_name' => 'JUAN',
            'deceased_middle_name' => 'MENDOZA',
            'deceased_last_name' => 'DELA CRUZ',
            'suffix' => 'SR.',
        ];

        $fullName = $refMethod->invoke($controller, $fields, 'death');
        $this->assertEquals('DELA CRUZ, JUAN MENDOZA SR.', $fullName);
    }

    /** Test saving marriage document into registry (documents and issuances tables). */
    public function test_saving_marriage_document_persists_clean_names_in_registry(): void
    {
        $docId = DB::table('documents')->insertGetId([
            'name' => 'Marriage_Scan.pdf',
            'type' => 'marriage',
            'date' => date('m/d/Y'),
            'size' => '1.5 MB',
            'status' => 'Pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $fields = [
            'husband_first_name' => 'SIMEON',
            'husband_middle_name' => '{"is_valid_document": true}', // Attempting corrupted JSON injection
            'husband_last_name' => 'NORCIO',
            'husband_suffix' => 'Jr.',
            'wife_first_name' => 'LUCILA',
            'wife_middle_name' => null,
            'wife_last_name' => 'ALMANO',
            'barangay' => 'Labac',
            'registry_number' => '1966-0125'
        ];

        $response = $this->withSession(['user_id' => $this->adminId])
            ->putJson("/api/documents/{$docId}", [
                'type' => 'marriage',
                'extracted_fields' => $fields,
                'ocr_text' => json_encode($fields),
                'status' => 'Processed',
                'barangay' => 'Labac',
            ]);

        $response->assertStatus(200);

        // Verify document table
        $doc = Document::find($docId);
        $this->assertEquals('NORCIO, SIMEON JR. & ALMANO, LUCILA', $doc->personName);
        $this->assertNull($doc->extracted_fields['husband_middle_name']);

        // Verify master registry (issuances) table
        $issuance = Issuance::where('document_id', $docId)->first();
        $this->assertNotNull($issuance);
        $this->assertEquals('NORCIO, SIMEON JR. & ALMANO, LUCILA', $issuance->name);
        $this->assertStringNotContainsString('{', $issuance->name);
    }
}

