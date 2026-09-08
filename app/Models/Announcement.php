<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Announcement application component.
 */
class Announcement extends Model
{
    /** Stores the fillable value used by this component. */
    protected $fillable = ['message', 'is_active'];

    /**
     * Executes the casts operation.
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
