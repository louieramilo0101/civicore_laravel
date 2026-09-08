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
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('client_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->enum('purpose', ['birth', 'death', 'marriage']);
            $table->enum('status', ['Pending', 'Serving', 'Completed', 'Cancelled'])->default('Pending');
            $table->json('details');
            $table->string('token')->unique();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
