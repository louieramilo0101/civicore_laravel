<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Defines the Migration migration implementation.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Split Status Columns
            if (!Schema::hasColumn('tickets', 'request_status')) {
                $table->string('request_status')->default('pending')->after('purpose');
            }
            if (!Schema::hasColumn('tickets', 'queue_status')) {
                $table->string('queue_status')->default('not_in_lobby')->after('request_status');
            }
            
            // Queue number tracking (e.g. 101, 102)
            if (!Schema::hasColumn('tickets', 'queue_number')) {
                $table->integer('queue_number')->nullable()->after('queue_status');
            }

            // QR code token tracking
            if (!Schema::hasColumn('tickets', 'qr_code_token')) {
                $table->string('qr_code_token')->nullable()->after('token');
            }

            // Timestamps for verification & final issuance
            if (!Schema::hasColumn('tickets', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('qr_code_path');
            }
            if (!Schema::hasColumn('tickets', 'issued_at')) {
                $table->timestamp('issued_at')->nullable()->after('verified_at');
            }
        });

        // Migrate existing legacy data to new decoupled fields before dropping legacy status
        if (Schema::hasColumn('tickets', 'status')) {
            $tickets = DB::table('tickets')->get();
            foreach ($tickets as $ticket) {
                $reqStatus = 'pending';
                $qStatus = 'not_in_lobby';

                // Map legacy token to qr_code_token
                $qrCodeToken = $ticket->qr_code_token ?: $ticket->token;

                switch (strtolower($ticket->status)) {
                    case 'pending':
                        $reqStatus = 'pending';
                        $qStatus = 'not_in_lobby';
                        break;
                    case 'serving':
                        $reqStatus = 'ready_for_pickup';
                        $qStatus = 'serving';
                        break;
                    case 'completed':
                        $reqStatus = 'completed';
                        $qStatus = 'not_in_lobby';
                        break;
                    case 'cancelled':
                    case 'expired':
                        $reqStatus = 'cancelled';
                        $qStatus = 'not_in_lobby';
                        break;
                }

                DB::table('tickets')
                    ->where('id', $ticket->id)
                    ->update([
                        'request_status' => $reqStatus,
                        'queue_status' => $qStatus,
                        'qr_code_token' => $qrCodeToken,
                    ]);
            }

            // Safely drop the legacy column 'status'
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        // Apply unique constraint to qr_code_token
        Schema::table('tickets', function (Blueprint $table) {
            $table->unique('qr_code_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique(['qr_code_token']);
        });

        Schema::table('tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('tickets', 'status')) {
                $table->string('status')->default('Pending')->after('purpose');
            }
        });

        // Map statuses back
        $tickets = DB::table('tickets')->get();
        foreach ($tickets as $ticket) {
            $status = 'Pending';
            if ($ticket->request_status === 'completed') {
                $status = 'Completed';
            } elseif ($ticket->request_status === 'cancelled') {
                $status = 'Cancelled';
            } elseif ($ticket->queue_status === 'serving') {
                $status = 'Serving';
            }

            DB::table('tickets')
                ->where('id', $ticket->id)
                ->update(['status' => $status]);
        }

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn([
                'request_status',
                'queue_status',
                'queue_number',
                'qr_code_token',
                'verified_at',
                'issued_at'
            ]);
        });
    }
};
