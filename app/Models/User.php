<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Represents the User application component.
 */
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'password',
        'role',
        'permissions',
    ];

    /** Stores the hidden value used by this component. */
    protected $hidden = [
        'password',
        'remember_token',
        'avatar',
    ];

    /**
     * Executes the casts operation.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'permissions'       => 'array',
        ];
    }

    /** Stores the appends value used by this component. */
    protected $appends = ['name'];

    /**
     * Executes the get name attribute operation.
     */
    public function getNameAttribute()
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    // ─── Role helpers ────────────────────────────────────────────────────────

    /**
     * Executes the is admin operation.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'Admin';
    }

    /**
     * Executes the is staff operation.
     */
    public function isStaff(): bool
    {
        return $this->role === 'Staff';
    }

    /**
     * Executes the is user operation.
     */
    public function isUser(): bool
    {
        return $this->role === 'User';
    }
}
