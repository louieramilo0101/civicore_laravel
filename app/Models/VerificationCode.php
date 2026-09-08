<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Verification Code application component.
 */
class VerificationCode extends Model
{
    /** Stores the fillable value used by this component. */
    protected $fillable = ['email', 'code', 'expires_at', 'used'];

    /** Stores the casts value used by this component. */
    protected $casts = [
        'expires_at' => 'datetime',
        'used'       => 'boolean',
    ];
}
