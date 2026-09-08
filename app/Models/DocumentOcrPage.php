<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents the Document Ocr Page application component.
 */
class DocumentOcrPage extends Model
{
    /** Stores the table value used by this component. */
    protected $table = 'document_ocr_pages';

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'document_id',
        'page_no',
        'text',
        'extracted_fields',
        'detected_type',
    ];

    /** Stores the casts value used by this component. */
    protected $casts = [
        'extracted_fields' => 'json',
    ];

    /**
     * Executes the document operation.
     */
    public function document()
    {
        return $this->belongsTo(Document::class);
    }
}
