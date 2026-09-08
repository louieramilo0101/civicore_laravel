<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Represents the Ticket Confirmation application component.
 */
class TicketConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    /** Stores the ticket associated with this message. */
    public Ticket $ticket;

    /** Stores the public URL for the ticket. */
    public string $ticketUrl;

    /** Stores the QR code image data encoded as base64. */
    public string $qrCodeBase64;

    /**
     * Creates a new component instance.
     */
    public function __construct(Ticket $ticket, string $qrCodeBase64, ?string $ticketUrl = null)
    {
        $this->ticket       = $ticket;
        $this->qrCodeBase64 = $qrCodeBase64;
        $this->ticketUrl    = $ticketUrl ?: url('/ticket-status/' . $ticket->token);
    }

    /**
     * Executes the envelope operation.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[CiviCORE] Your Queue Ticket – ' . $this->ticket->ticket_number,
        );
    }

    /**
     * Executes the content operation.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.ticket_confirmation',
        );
    }
}
