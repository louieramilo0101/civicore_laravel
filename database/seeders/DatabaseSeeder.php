<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Represents the Database Seeder application component.
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // SuperAdmin — full system access
        User::create([
            'first_name' => 'SuperAdmin',
            'last_name'  => 'Officer',
            'email'    => 'superadmin@civicore.gov.ph',
            'password' => Hash::make('superadmin2024'),
            'role'     => 'SuperAdmin',
        ]);

        // Admin — internal employee, restricted to operational functions
        User::create([
            'first_name' => 'Admin',
            'last_name'  => 'Officer',
            'email'    => 'admin@civicore.gov.ph',
            'password' => Hash::make('admin2024'),
            'role'     => 'Admin',
        ]);
    }
}
