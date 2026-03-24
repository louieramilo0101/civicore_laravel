<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create specific users for different roles
        // Superadmin account
        User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@civicore.com',
            'role' => 'Superadmin',
            'password' => 'password',
        ]);

        // Admin account
        User::factory()->create([
            'name' => 'Admin Officer',
            'email' => 'admin@civicore.com',
            'role' => 'Admin',
            'password' => 'password',
        ]);

        // Regular User account
        User::factory()->create([
            'name' => 'Civilian User',
            'email' => 'user@civicore.com',
            'role' => 'User',
            'password' => 'password',
        ]);

        // Optional more test users
        // User::factory(5)->create();
    }
}
