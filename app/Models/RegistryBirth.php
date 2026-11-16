<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents a Birth record in the Registry Database.
 */
class RegistryBirth extends Model
{
    use SoftDeletes;

    protected $table = 'registry_births';

    protected $fillable = [
        'certNumber',
        'registry_number',
        'name',
        'barangay',
        'issuanceDate',
        'status',
        'encoded_by',
        'extracted_data',
        'file_path',
        'image_path',
        'document_id',
        'archived_at',
        'archive_reason',
    ];

    protected $casts = [
        'extracted_data' => 'array',
        'issuanceDate' => 'date',
        'archived_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the source document (scan/upload).
     */
    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    /**
     * Scope for active records only.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for archived records only.
     */
    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }
}