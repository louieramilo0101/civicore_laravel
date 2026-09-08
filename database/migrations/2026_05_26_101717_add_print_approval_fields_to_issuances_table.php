<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
        Schema::table('issuances', function (Blueprint $table) {
            $table->string('or_number')->nullable();
            $table->text('print_remarks')->nullable();
            $table->string('requested_by')->nullable();
            $table->string('approved_by')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropColumn(['or_number', 'print_remarks', 'requested_by', 'approved_by']);
        });
    }
};
