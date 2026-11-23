<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Models\Ticket;
use App\Mail\TicketConfirmation;
use Carbon\Carbon;

class SupabaseSyncService
{
    protected ?string $url;
    protected ?string $serviceKey;

    public function __construct()
    {
        $this->url = rtrim(config('services.supabase.url') ?: env('SUPABASE_URL', ''), '/');
        $this->serviceKey = config('services.supabase.service_key') ?: env('SUPABASE_SERVICE_KEY', '');
    }

    public function isConfigured(): bool
    {
        return !empty($this->url) && !empty($this->serviceKey);
    }

    protected function client()
    {
        return Http::withHeaders([
            'apikey'        => $this->serviceKey,
            'Authorization' => 'Bearer ' . $this->serviceKey,
            'Content-Type'  => 'application/json',
            'Prefer'        => 'return=representation',
        ])->timeout(10);
    }

    /**
     * Pulls pending online tickets submitted on Supabase and inserts them into local MySQL.
     * Handshake: Once imported into local MySQL, marks `synced_to_local = true` on Supabase.
     */
    public function pullPendingOnlineTickets(): int
    {
        if (!$this->isConfigured()) {
            return 0;
        }

        try {
            // Fetch unsynced tickets from Supabase public_tickets table
            $response = $this->client()->get("{$this->url}/rest/v1/public_tickets", [
                'synced_to_local' => 'eq.false',
                'order'           => 'created_at.asc',
                'limit'           => 50,
            ]);

            if (!$response->successful()) {
                Log::warning('SupabaseSync: Failed to fetch unsynced tickets', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return 0;
            }

            $onlineTickets = $response->json();
            if (empty($onlineTickets)) {
                return 0;
            }

            $syncedCount = 0;

            foreach ($onlineTickets as $sTicket) {
                $token = $sTicket['token'] ?? null;
                if (!$token) {
                    continue;
                }

                // Check if already in local DB
                $existing = Ticket::where('token', $token)->first();

                if (!$existing) {
                    // Generate local ticket number sequence
                    $countToday = Ticket::whereDate('created_at', Carbon::today())->count() + 1;
                    $prefix = strtoupper(substr($sTicket['purpose'] ?? 'GEN', 0, 1));
                    $localTicketNumber = sprintf('%s-%03d', $prefix, $countToday);

                    $ticket = Ticket::create([
                        'token'          => $token,
                        'ticket_number'  => $localTicketNumber,
                        'client_name'    => $sTicket['client_name'] ?? 'Online Citizen',
                        'email'          => $sTicket['email'] ?? null,
                        'phone'          => $sTicket['phone'] ?? null,
                        'purpose'        => $sTicket['purpose'] ?? 'general',
                        'request_status' => $sTicket['request_status'] ?? 'pending',
                        'queue_status'   => $sTicket['queue_status'] ?? 'not_in_lobby',
                        'queue_number'   => $countToday,
                        'details'        => is_array($sTicket['details'] ?? null) ? json_encode($sTicket['details']) : ($sTicket['details'] ?? null),
                    ]);

                    // Update Supabase with the assigned ticket_number and mark as synced
                    $patchRes = $this->client()->patch("{$this->url}/rest/v1/public_tickets?token=eq.{$token}", [
                        'ticket_number'   => $localTicketNumber,
                        'queue_number'    => $countToday,
                        'synced_to_local' => true,
                        'updated_at'      => Carbon::now()->toIso8601String(),
                    ]);

                    if ($patchRes->successful()) {
                        $syncedCount++;
                    }

                    // Dispatch confirmation email if citizen provided email address
                    if (!empty($ticket->email)) {
                        $this->sendTicketEmail($ticket);
                    }
                } else {
                    // Already in local MySQL, just acknowledge sync on Supabase
                    $this->client()->patch("{$this->url}/rest/v1/public_tickets?token=eq.{$token}", [
                        'synced_to_local' => true,
                    ]);
                    $syncedCount++;
                }
            }

            return $syncedCount;
        } catch (\Throwable $e) {
            Log::error('SupabaseSync: Error during ticket pull', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * Pushes a local ticket status change (e.g. staff calls a ticket) to Supabase.
     */
    public function pushTicketStatus(string $token, string $queueStatus, ?string $window = null): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $payload = [
                'queue_status' => $queueStatus,
                'updated_at'   => Carbon::now()->toIso8601String(),
            ];
            if ($window) {
                $payload['assigned_window'] = $window;
            }

            $response = $this->client()->patch("{$this->url}/rest/v1/public_tickets?token=eq.{$token}", $payload);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('SupabaseSync: Error pushing ticket status', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Updates the public live queue display board for a specific window.
     */
    public function updateQueueDisplay(string $windowId, ?string $currentTicket, string $status = 'calling'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $response = $this->client()->patch("{$this->url}/rest/v1/queue_display_state?window_id=eq.{$windowId}", [
                'current_ticket' => $currentTicket,
                'status'         => $status,
                'updated_at'     => Carbon::now()->toIso8601String(),
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('SupabaseSync: Error updating queue display state', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Pushes announcements and opening hours from local settings to Supabase public_config.
     * Called by the sync command so the Vercel landing page shows up-to-date info.
     */
    public function pushPublicConfig(): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            // Load announcements from local DB (active only)
            $announcements = DB::table('announcements')
                ->where('is_active', true)
                ->orderByDesc('created_at')
                ->get(['id', 'message', 'created_at'])
                ->map(fn ($a) => ['id' => $a->id, 'message' => $a->message, 'created_at' => $a->created_at])
                ->values()
                ->toArray();

            // Load opening hours from settings
            $openingHours = DB::table('settings')->where('key', 'opening_hours')->value('value')
                ?? 'Monday - Friday: 8:00 AM - 5:00 PM';

            // Upsert opening_hours using PostgREST on_conflict upsert
            $this->client()
                ->withHeaders([
                    'Prefer' => 'resolution=merge-duplicates,return=representation',
                ])
                ->post("{$this->url}/rest/v1/public_config?on_conflict=key", [
                    'key'        => 'opening_hours',
                    'value'      => $openingHours,
                    'updated_at' => Carbon::now()->toIso8601String(),
                ]);

            // Upsert announcements using PostgREST on_conflict upsert
            $this->client()
                ->withHeaders([
                    'Prefer' => 'resolution=merge-duplicates,return=representation',
                ])
                ->post("{$this->url}/rest/v1/public_config?on_conflict=key", [
                    'key'        => 'announcements',
                    'value'      => $announcements,
                    'updated_at' => Carbon::now()->toIso8601String(),
                ]);

            Log::info('SupabaseSync: Public config pushed', [
                'announcements' => count($announcements),
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('SupabaseSync: Error pushing public config', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Sends the ticket confirmation email with generated QR code.
     */
    protected function sendTicketEmail(Ticket $ticket): void
    {
        try {
            $portalUrl = env('PUBLIC_PORTAL_URL') ?: config('app.url', 'https://civicore-laravel.vercel.app');
            $ticketUrl = rtrim($portalUrl, '/') . "/ticket-status/{$ticket->token}";

            [$qrPath, $qrBase64] = $this->generateQr($ticket->token, $ticketUrl);

            // Save generated QR path to local ticket record
            $ticket->update(['qr_code_path' => $qrPath]);

            Mail::to($ticket->email)->send(new TicketConfirmation($ticket, $qrBase64, $ticketUrl));
            Log::info("SupabaseSync: Sent ticket confirmation email to {$ticket->email} for ticket {$ticket->ticket_number}");
        } catch (\Throwable $mailErr) {
            Log::warning('SupabaseSync: Ticket confirmation email failed: ' . $mailErr->getMessage());
        }
    }

    /**
     * Generates a QR code PNG, saves it to public disk, and returns base64 string.
     */
    protected function generateQr(string $token, string $ticketUrl): array
    {
        $filename = 'qrcodes/ticket_' . $token . '.png';

        $qr = \BaconQrCode\Encoder\Encoder::encode($ticketUrl, \BaconQrCode\Common\ErrorCorrectionLevel::M());
        $matrix = $qr->getMatrix();
        $width = $matrix->getWidth();
        $height = $matrix->getHeight();

        $scale = 8;
        $margin = 2;
        $imgSize = ($width + ($margin * 2)) * $scale;

        $image = imagecreatetruecolor($imgSize, $imgSize);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);

        imagefill($image, 0, 0, $white);

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                if ($matrix->get($x, $y) === 1) {
                    $px = ($x + $margin) * $scale;
                    $py = ($y + $margin) * $scale;
                    imagefilledrectangle($image, $px, $py, $px + $scale - 1, $py + $scale - 1, $black);
                }
            }
        }

        ob_start();
        imagepng($image);
        $pngData = ob_get_clean();
        imagedestroy($image);

        Storage::disk('public')->put($filename, $pngData);

        return [$filename, base64_encode($pngData)];
    }
}
