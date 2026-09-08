<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Ticket;

/**
 * Represents the Ticket Declined Mail application component.
 */
class TicketDeclinedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Stores the ticket value used by this component. */
    public $ticket;
    /** Stores the reason value used by this component. */
    public $reason;

    /**
     * Create a new message instance.
     */
    public function __construct(Ticket $ticket, $reason)
    {
        $this->ticket = $ticket;
        $this->reason = $reason;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Request Has Been Declined - Ticket ' . $this->ticket->ticket_number,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.tickets.declined',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
