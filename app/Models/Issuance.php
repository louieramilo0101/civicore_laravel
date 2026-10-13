<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents the Issuance application component.
 */
class Issuance extends Model
{
    use SoftDeletes;

    /** Stores the table value used by this component. */
    protected $table = 'issuances';

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'document_id',
        'certNumber',
        'type',
        'name',
        'barangay',
        'issuanceDate',
        'status',
        'encoded_by',
        'extracted_data',
        'file_path',
        'image_path',
    ];

    /** Stores the hidden value to prevent payload bloat. */
    protected $hidden = [
        'file_data',
    ];

    /**
     * Executes the document operation.
     */
    public function document()
    {
        return $this->belongsTo(Document::class);
    }
}
