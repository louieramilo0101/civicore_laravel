<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Represents the Ticket application component.
 */
class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    /** Stores the fillable value used by this component. */
    protected $fillable = [
        'ticket_number',
        'client_name',
        'email',
        'phone',
        'purpose',
        'details',
        'request_status',
        'queue_status',
        'queue_number',
        'token',
        'qr_code_token',
        'document_id',
        'expires_at',
        'source',
        'qr_code_path',
        'verified_at',
        'issued_at',
    ];

    /** Stores the casts value used by this component. */
    protected $casts = [
        'details'      => 'array',
        'expires_at'   => 'datetime',
        'verified_at'  => 'datetime',
        'issued_at'    => 'datetime',
        'queue_number' => 'integer',
    ];

    /**
     * Executes the document operation.
     */
    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Whether this ticket has expired (past 5 PM on submission day).
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) return false;
        return now()->gt($this->expires_at);
    }

    /**
     * Scopes for digital requests and lobby queue
     */
    public function scopePendingRequests($query)
    {
        return $query->where('request_status', 'pending');
    }

    /**
     * Executes the scope ready requests operation.
     */
    public function scopeReadyRequests($query)
    {
        return $query->where('request_status', 'ready_for_pickup');
    }

    /**
     * Executes the scope active lobby queue operation.
     */
    public function scopeActiveLobbyQueue($query)
    {
        return $query->whereIn('queue_status', ['waiting', 'serving']);
    }
}
