<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Web Vitals uses the rating value "needs-improvement" (17 characters),
     * which exceeded the original 16-character column and caused every such
     * metric to fail insertion (HTTP 500 on /api/rum/metrics).
     */
    public function up(): void
    {
        Schema::table('rum_metrics', function (Blueprint $table) {
            $table->string('rating', 32)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('rum_metrics', function (Blueprint $table) {
            $table->string('rating', 16)->nullable()->change();
        });
    }
};
