<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Activity Log application component.
 */
class ActivityLog extends Model
{
    /** Stores the table value used by this component. */
    protected $table = 'activity_logs';

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'user_name',
        'action',
        'record_type',
        'record_id',
        'details',
    ];
}
