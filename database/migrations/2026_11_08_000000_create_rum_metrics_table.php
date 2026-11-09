<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::create('rum_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('metric_name', 32);     // lcp, inp, cls, fcp, ttfb, fid
            $table->decimal('value', 10, 4);       // raw metric value
            $table->string('rating', 16)->nullable(); // good, needs-improvement, poor
            $table->string('page_path', 255)->nullable();
            $table->string('page_title', 255)->nullable();
            $table->string('connection_type', 32)->nullable(); // 4g, 3g, wifi, unknown
            $table->string('device_type', 32)->nullable(); // mobile, desktop, tablet
            $table->string('browser', 64)->nullable();
            $table->string('os', 64)->nullable();
            $table->string('country', 64)->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('recorded_at')->nullable();
            $table->timestamps();

            $table->index(['metric_name', 'recorded_at']);
            $table->index('page_path');
            $table->index('recorded_at');
        });

        // Partition by month for efficient querying on large datasets
        // (MySQL only — skipped on SQLite for testing compatibility)
        if (config('database.default') === 'mysql') {
            // Raw SQL partitioning is handled at deployment time;
            // indexes above provide sufficient query performance for now.
        }
    }

    public function down()
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('rum_metrics');
        Schema::enableForeignKeyConstraints();
    }
};