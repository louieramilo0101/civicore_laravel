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
        Schema::table('documents', function (Blueprint $table) {
            if (!Schema::hasColumn('documents', 'image_path')) {
                $table->string('image_path')->nullable()->after('file_path')->comment('Path to stored A4 picture scan');
            }
        });

        Schema::table('issuances', function (Blueprint $table) {
            if (!Schema::hasColumn('issuances', 'image_path')) {
                $table->string('image_path')->nullable()->after('file_path')->comment('Path to stored A4 picture scan');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'image_path')) {
                $table->dropColumn('image_path');
            }
        });

        Schema::table('issuances', function (Blueprint $table) {
            if (Schema::hasColumn('issuances', 'image_path')) {
                $table->dropColumn('image_path');
            }
        });
    }
};
