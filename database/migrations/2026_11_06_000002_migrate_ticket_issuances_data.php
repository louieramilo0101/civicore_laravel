<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Move all ticket-linked issuance rows from `issuances` to `ticket_issuances`.
     * A "real" ticket row is one where ticket_number is NOT NULL and NOT a
     * system-generated placeholder (the system auto-stamps 'T-2026-0NNN'
     * on plain registry uploads — those stay in `issuances`).
     */
    public function up(): void
    {
        // Move ALL ticket-linked rows (any non-null ticket_number) to ticket_issuances.
        $rows = DB::table('issuances')->whereNotNull('ticket_number')->get();

        foreach ($rows as $row) {
            $ticketId = DB::table('tickets')
                ->where('ticket_number', $row->ticket_number)
                ->value('id');

            DB::table('ticket_issuances')->insertOrIgnore([
                'ticket_id'       => $ticketId,
                'ticket_number'   => $row->ticket_number,
                'document_id'     => $row->document_id,
                'certNumber'      => $row->certNumber,
                'registry_number' => $row->registry_number,
                'type'            => $row->type,
                'certificate_type'=> $row->certificate_type,
                'name'            => $row->name,
                'barangay'        => $row->barangay,
                'issuanceDate'    => $row->issuanceDate,
                'status'          => $row->status,
                'encoded_by'      => $row->encoded_by,
                'or_number'       => $row->or_number,
                'print_remarks'   => $row->print_remarks,
                'requested_by'    => $row->requested_by,
                'approved_by'     => $row->approved_by,
                'extracted_data'  => $row->extracted_data,
                'file_path'       => $row->file_path,
                'image_path'      => $row->image_path,
                'created_at'      => $row->created_at,
                'updated_at'      => $row->updated_at,
                'deleted_at'      => $row->deleted_at,
            ]);

            DB::table('issuances')->where('id', $row->id)->delete();
        }
    }

    public function down(): void
    {
        // Move rows back to issuances on rollback
        $rows = DB::table('ticket_issuances')->get();
        foreach ($rows as $row) {
            DB::table('issuances')->insert([
                'ticket_number'   => $row->ticket_number,
                'document_id'     => $row->document_id,
                'certNumber'      => $row->certNumber,
                'registry_number' => $row->registry_number,
                'type'            => $row->type,
                'certificate_type'=> $row->certificate_type,
                'name'            => $row->name,
                'barangay'        => $row->barangay,
                'issuanceDate'    => $row->issuanceDate,
                'status'          => $row->status,
                'encoded_by'      => $row->encoded_by,
                'or_number'       => $row->or_number,
                'print_remarks'   => $row->print_remarks,
                'requested_by'    => $row->requested_by,
                'approved_by'     => $row->approved_by,
                'extracted_data'  => $row->extracted_data,
                'file_path'       => $row->file_path,
                'image_path'      => $row->image_path,
                'created_at'      => $row->created_at,
                'updated_at'      => $row->updated_at,
                'deleted_at'      => $row->deleted_at,
            ]);
        }
        DB::table('ticket_issuances')->truncate();
    }
};

