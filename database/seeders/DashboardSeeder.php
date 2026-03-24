<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed Barangays
        $barangays = [
            "Gomez-Zamora (Pob.)", "Capt. C. Nazareno (Pob.)", "Ibayo Silangan",
            "Ibayo Estacion", "Kanluran", "Makina", "Sapa", "Bucana Malaki",
            "Bucana Sasahan", "Bagong Karsada", "Balsahan", "Bancaan", "Muzon",
            "Latoria", "Labac", "Mabolo", "San Roque", "Santulan", "Molino",
            "Calubcob", "Halang", "Malainen Bago", "Malainen Luma", "Palangue 1",
            "Palangue 2 & 3", "Humbac", "Munting Mapino", "Sabang", "Timalan Balsahan",
            "Timalan Concepcion"
        ];

        foreach ($barangays as $name) {
            DB::table('barangays')->insertOrIgnore([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Seed Documents with varied dates for trends (last 6 months)
        $docTypes = ['Live Birth', 'Death', 'Marriage'];
        $statuses = ['processed', 'pending', 'failed'];
        
        for ($i = 0; $i < 300; $i++) {
            $type = $docTypes[array_rand($docTypes)];
            $status = $statuses[array_rand($statuses)];
            $createdAt = Carbon::now()->subDays(rand(0, 180));
            $barangay = $barangays[array_rand($barangays)];

            DB::table('documents')->insert([
                'name' => $type . ' Document - ' . rand(1000, 9999),
                'type' => strtolower(str_replace(' ', '_', $type)),
                'date' => $createdAt->format('m/d/Y'),
                'size' => rand(1, 5) . '.' . rand(0, 99) . ' MB',
                'status' => $status,
                'personName' => 'Person ' . $i,
                'barangay' => $barangay,
                'metadata' => json_encode(['originalName' => 'doc.pdf']),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        // 3. Seed Issuances
        $prefixes = ['BC', 'DC', 'ML'];
        foreach ($prefixes as $index => $prefix) {
            $type = ($prefix == 'BC') ? 'birth' : (($prefix == 'DC') ? 'death' : 'marriage');
            for ($j = 0; $j < 20; $j++) {
                $createdAt = Carbon::now()->subDays(rand(0, 30));
                DB::table('issuances')->insert([
                    'certNumber' => $prefix . '-' . $createdAt->year . '-' . str_pad($j + 1, 3, '0', STR_PAD_LEFT),
                    'type' => $type,
                    'name' => 'Subject Name ' . $j,
                    'barangay' => $barangays[array_rand($barangays)],
                    'issuanceDate' => $createdAt->format('m/d/Y'),
                    'status' => 'Active',
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }
}
