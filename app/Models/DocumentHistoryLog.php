<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Document History Log application component.
 */
class DocumentHistoryLog extends Model
{
    /** Stores the table value used by this component. */
    protected $table = 'document_history_logs';

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'document_id',
        'filename',
        'person_name',
        'type',
        'barangay',
        'encoded_by',
        'action',
        'details',
    ];

    /**
     * Executes the document operation.
     */
    public function document()
    {
        return $this->belongsTo(Document::class);
    }
}
