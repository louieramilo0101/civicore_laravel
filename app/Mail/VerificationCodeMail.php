<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Represents the Verification Code Mail application component.
 */
class VerificationCodeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Stores the verification code sent by this message. */
    protected string $code;

    /** Stores the recipient email address. */
    protected string $email;

    /**
     * Creates a new component instance.
     */
    public function __construct(string $email, string $code)
    {
        $this->email = $email;
        $this->code  = $code;
    }

    /**
     * Executes the build operation.
     */
    public function build()
    {
        return $this
            ->subject('CiviCORE — Your Account Verification Code')
            ->view('mail.verification_code')
            ->with([
                'code'  => $this->code,
                'email' => $this->email,
            ]);
    }
}
