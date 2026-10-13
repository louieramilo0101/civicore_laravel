<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents the Document application component.
 */
class Document extends Model
{
    use SoftDeletes;

    /** Stores the table value used by this component. */
    protected $table = 'documents';

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'name',
        'type',
        'date',
        'size',
        'status',
        'previewData',
        'personName',
        'barangay',
        'metadata',
        'file_path',
        'image_path',
        'raw_text',
        'ocr_text',
        'extracted_fields',
        'extracted_data',
        'detected_type',
        'parental_consent',
        'encoded_by',
    ];

    /** Stores the hidden value to prevent payload bloat. */
    protected $hidden = [
        'file_data',
        'previewData',
        'raw_text',
    ];

    /** Stores the casts value used by this component. */
    protected $casts = [
        'metadata' => 'json',
        'extracted_fields' => 'json',
        'extracted_data' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Executes the issuance operation.
     */
    public function issuance()
    {
        return $this->hasOne(Issuance::class);
    }

    /**
     * Executes the ocr pages operation.
     */
    public function ocrPages()
    {
        return $this->hasMany(DocumentOcrPage::class);
    }

    /**
     * Executes the history logs operation.
     */
    public function historyLogs()
    {
        return $this->hasMany(DocumentHistoryLog::class);
    }

    /**
     * Search documents by raw_text and file_name using FULLTEXT search
     * 
     * @param string $query Search term
     * @param int $limit Results per page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public static function search($query, $limit = 20)
    {
        return self::whereRaw(
            'MATCH(raw_text, name) AGAINST(? IN BOOLEAN MODE)',
            [$query]
        )
        ->orderByRaw('MATCH(raw_text, name) AGAINST(? IN BOOLEAN MODE) DESC', [$query])
        ->paginate($limit);
    }

    /**
     * Search by raw_text only (for full-text indexing)
     * 
     * @param string $query Search term
     */
    public static function searchByRawText($query)
    {
        return self::whereRaw(
            'MATCH(raw_text) AGAINST(? IN BOOLEAN MODE)',
            [$query]
        )
        ->orderByRaw('MATCH(raw_text) AGAINST(? IN BOOLEAN MODE) DESC', [$query]);
    }

    /**
     * Search by file name
     * 
     * @param string $query Search term
     */
    public static function searchByFileName($query)
    {
        return self::where('name', 'LIKE', "%{$query}%")
            ->orderBy('created_at', 'desc');
    }

    /**
     * Filter by document type
     * 
     * @param string $type Document type
     * @return \Illuminate\Database\Query\Builder
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Filter by status
     * 
     * @param string $status Document status
     * @return \Illuminate\Database\Query\Builder
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Get extracted person name from extracted_data JSON
     * 
     * @return string|null
     */
    public function getExtractedPersonName()
    {
        if (!$this->extracted_data) {
            return null;
        }

        $data = $this->extracted_data;
        
        if ($this->type === 'marriage' && isset($data['husband_last_name'])) {
            $h = trim(($data['husband_last_name'] ?? '') . ', ' . 
                      ($data['husband_first_name'] ?? '') . ' ' . 
                      ($data['husband_middle_name'] ?? '') . ' ' . 
                      ($data['husband_suffix'] ?? ''));
            $w = trim(($data['wife_last_name'] ?? '') . ', ' . 
                      ($data['wife_first_name'] ?? '') . ' ' . 
                      ($data['wife_middle_name'] ?? '') . ' ' . 
                      ($data['wife_suffix'] ?? ''));
            return trim("$h & $w", " &");
        }

        // Default for Birth/Death
        $last = $data['last_name'] ?? '';
        $first = $data['first_name'] ?? '';
        $middle = $data['middle_name'] ?? '';
        $suffix = $data['suffix'] ?? '';

        if (!$last && !$first) {
            return null;
        }

        return trim("$last, $first $middle $suffix");
    }
}
