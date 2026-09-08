<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Setting application component.
 */
class Setting extends Model
{
    /** Stores the fillable value used by this component. */
    protected $fillable = ['key', 'value'];
}
