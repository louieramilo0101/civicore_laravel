<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('issuances')) {
            Schema::create('issuances', function (Blueprint $table) {
                $table->id();
                $table->string('certNumber')->unique();
                $table->string('type');
                $table->string('name');
                $table->string('barangay')->nullable();
                $table->string('issuanceDate');
                $table->string('status')->default('Active');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issuances');
    }
};
