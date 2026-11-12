<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Drop the column if it already exists (idempotent migration)
        if (Schema::hasColumn('documents', 'processing_decision')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('processing_decision');
            });
        }
        
        Schema::table('documents', function (Blueprint $table) {
            $table->text('processing_decision')->nullable()->after('metadata');
        });
    }

    public function down()
    {
        if (Schema::hasColumn('documents', 'processing_decision')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('processing_decision');
            });
        }
    }
};