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
        $data = $this->extracted_data ?: $this->extracted_fields;
        if (!$data || !is_array($data)) {
            return null;
        }

        $clean = function ($val) {
            if (!$val || !is_string($val)) return '';
            $trimmed = trim($val);
            if (str_contains($trimmed, '{') || str_contains($trimmed, '}') || str_contains($trimmed, '":') || str_contains($trimmed, 'is_valid_document')) {
                return '';
            }
            return $trimmed;
        };

        if (($this->type === 'marriage' || $this->type === 'marriage_license') && (isset($data['husband_last_name']) || isset($data['wife_last_name']))) {
            $hLast = $clean($data['husband_last_name'] ?? '');
            $hFirst = $clean($data['husband_first_name'] ?? '');
            $hMiddle = $clean($data['husband_middle_name'] ?? '');
            $hSuffix = $clean($data['husband_suffix'] ?? '');
            $hParts = array_filter([$hLast ? "{$hLast}," : '', $hFirst, $hMiddle, $hSuffix]);
            $h = implode(' ', $hParts);

            $wLast = $clean($data['wife_last_name'] ?? '');
            $wFirst = $clean($data['wife_first_name'] ?? '');
            $wMiddle = $clean($data['wife_middle_name'] ?? '');
            $wSuffix = $clean($data['wife_suffix'] ?? '');
            $wParts = array_filter([$wLast ? "{$wLast}," : '', $wFirst, $wMiddle, $wSuffix]);
            $w = implode(' ', $wParts);

            return trim("$h & $w", " &");
        }

        // Default for Birth/Death
        $last = $clean($data['last_name'] ?? $data['child_last_name'] ?? $data['deceased_last_name'] ?? '');
        $first = $clean($data['first_name'] ?? $data['child_first_name'] ?? $data['deceased_first_name'] ?? '');
        $middle = $clean($data['middle_name'] ?? $data['child_middle_name'] ?? $data['deceased_middle_name'] ?? '');
        $suffix = $clean($data['suffix'] ?? '');

        if (!$last && !$first) {
            return null;
        }

        $parts = array_filter([$last ? "{$last}," : '', $first, $middle, $suffix]);
        return implode(' ', $parts);
    }
}
