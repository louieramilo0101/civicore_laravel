<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add unique index on registry_number for registry_births
        if (Schema::hasTable('registry_births') && Schema::hasColumn('registry_births', 'registry_number')) {
            // First, remove any duplicate registry_numbers (keep the first one)
            DB::statement("
                DELETE t1 FROM registry_births t1
                INNER JOIN registry_births t2 
                WHERE t1.id > t2.id 
                AND t1.registry_number = t2.registry_number 
                AND t1.registry_number IS NOT NULL 
                AND t1.registry_number != ''
            ");

            // Add unique index
            try {
                Schema::table('registry_births', function (Blueprint $table) {
                    $table->unique('registry_number', 'unique_registry_number_births');
                });
            } catch (\Exception $e) {
                // Index might already exist or there are still duplicates
                \Log::warning("Could not add unique index on registry_births.registry_number: " . $e->getMessage());
            }
        }

        // Add unique index on registry_number for registry_deaths
        if (Schema::hasTable('registry_deaths') && Schema::hasColumn('registry_deaths', 'registry_number')) {
            DB::statement("
                DELETE t1 FROM registry_deaths t1
                INNER JOIN registry_deaths t2 
                WHERE t1.id > t2.id 
                AND t1.registry_number = t2.registry_number 
                AND t1.registry_number IS NOT NULL 
                AND t1.registry_number != ''
            ");

            try {
                Schema::table('registry_deaths', function (Blueprint $table) {
                    $table->unique('registry_number', 'unique_registry_number_deaths');
                });
            } catch (\Exception $e) {
                \Log::warning("Could not add unique index on registry_deaths.registry_number: " . $e->getMessage());
            }
        }

        // Add unique index on registry_number for registry_marriages
        if (Schema::hasTable('registry_marriages') && Schema::hasColumn('registry_marriages', 'registry_number')) {
            DB::statement("
                DELETE t1 FROM registry_marriages t1
                INNER JOIN registry_marriages t2 
                WHERE t1.id > t2.id 
                AND t1.registry_number = t2.registry_number 
                AND t1.registry_number IS NOT NULL 
                AND t1.registry_number != ''
            ");

            try {
                Schema::table('registry_marriages', function (Blueprint $table) {
                    $table->unique('registry_number', 'unique_registry_number_marriages');
                });
            } catch (\Exception $e) {
                \Log::warning("Could not add unique index on registry_marriages.registry_number: " . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('registry_births')) {
            try {
                Schema::table('registry_births', function (Blueprint $table) {
                    $table->dropUnique('unique_registry_number_births');
                });
            } catch (\Exception $e) {
                // Index might not exist
            }
        }

        if (Schema::hasTable('registry_deaths')) {
            try {
                Schema::table('registry_deaths', function (Blueprint $table) {
                    $table->dropUnique('unique_registry_number_deaths');
                });
            } catch (\Exception $e) {
            }
        }

        if (Schema::hasTable('registry_marriages')) {
            try {
                Schema::table('registry_marriages', function (Blueprint $table) {
                    $table->dropUnique('unique_registry_number_marriages');
                });
            } catch (\Exception $e) {
            }
        }
    }
};
