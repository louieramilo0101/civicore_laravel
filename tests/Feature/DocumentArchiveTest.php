<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Represents the Document Archive Test application component.
 */
class DocumentArchiveTest extends TestCase
{
    use RefreshDatabase;

    /** Stores the database identifier for the authenticated administrator. */
    protected int $adminId;

    /**
     * Executes the set up operation.
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup a mock storage disk
        Storage::fake('public');

        // Create an Admin user for sessions
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

    /**
     * Executes the test_can_retrieve_only_archived_documents operation.
     */
    public function test_can_retrieve_only_archived_documents()
    {
        // Insert active document
        $activeId = DB::table('documents')->insertGetId([
            'name' => 'Active Doc.pdf',
            'type' => 'birth',
            'date' => '2026-05-26',
            'size' => '1024',
            'status' => 'Uploaded',
            'deleted_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert archived (soft-deleted) document
        $archivedId = DB::table('documents')->insertGetId([
            'name' => 'Archived Doc.pdf',
            'type' => 'birth',
            'date' => '2026-05-26',
            'size' => '2048',
            'status' => 'Uploaded',
            'deleted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Request archived documents with Admin session
        $response = $this->withSession(['user_id' => $this->adminId])
                         ->getJson('/api/documents/archived');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $archivedId);
        $response->assertJsonPath('data.0.name', 'Archived Doc.pdf');
    }

    /**
     * Executes the test_can_restore_soft_deleted_document operation.
     */
    public function test_can_restore_soft_deleted_document()
    {
        // Insert archived document
        $documentId = DB::table('documents')->insertGetId([
            'name' => 'ToRestore.pdf',
            'type' => 'birth',
            'date' => '2026-05-26',
            'size' => '2048',
            'status' => 'Uploaded',
            'deleted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert archived issuance
        $issuanceId = DB::table('issuances')->insertGetId([
            'document_id' => $documentId,
            'type' => 'birth',
            'certNumber' => '12345',
            'name' => 'Child Name',
            'issuanceDate' => '2026-05-26',
            'deleted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Call restore with Admin session
        $response = $this->withSession(['user_id' => $this->adminId])
                         ->postJson("/api/documents/{$documentId}/undo");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify it is active again
        $this->assertDatabaseHas('documents', [
            'id' => $documentId,
            'deleted_at' => null,
        ]);

        $this->assertDatabaseHas('issuances', [
            'id' => $issuanceId,
            'deleted_at' => null,
        ]);
    }

    /**
     * Executes the test_can_purge_document_and_files operation.
     */
    public function test_can_purge_document_and_files()
    {
        // Create mock files in storage
        Storage::disk('public')->put('documents/mock_doc.pdf', 'file content');
        Storage::disk('public')->put('issuances/mock_iss.pdf', 'file content');

        // Insert archived document
        $documentId = DB::table('documents')->insertGetId([
            'name' => 'ToPurge.pdf',
            'type' => 'birth',
            'date' => '2026-05-26',
            'size' => '2048',
            'status' => 'Uploaded',
            'file_path' => 'documents/mock_doc.pdf',
            'deleted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert archived issuance
        $issuanceId = DB::table('issuances')->insertGetId([
            'document_id' => $documentId,
            'type' => 'birth',
            'certNumber' => '12345',
            'name' => 'Child Name',
            'issuanceDate' => '2026-05-26',
            'file_path' => 'issuances/mock_iss.pdf',
            'deleted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Call purge with Admin session
        $response = $this->withSession(['user_id' => $this->adminId])
                         ->deleteJson("/api/documents/{$documentId}/purge");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify database records are deleted
        $this->assertDatabaseMissing('documents', ['id' => $documentId]);
        $this->assertDatabaseMissing('issuances', ['id' => $issuanceId]);

        // Verify storage files are deleted
        Storage::disk('public')->assertMissing('documents/mock_doc.pdf');
        Storage::disk('public')->assertMissing('issuances/mock_iss.pdf');
    }
}
