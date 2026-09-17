<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ticket;
use App\Models\Setting;
use App\Mail\TicketConfirmation;
use App\Mail\TicketDeclinedMail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Carbon\Carbon;

/**
 * Represents the Ticket Controller application component.
 */
class TicketController extends Controller
{
    // ─── Helpers ────────────────────────────────────────────────────────────

    /**
     * Build the 5 PM expiry timestamp for the current day.
     */
    private function buildExpiry(): Carbon
    {
        $expiry = Carbon::today(config('app.timezone'))->setTime(17, 0, 0);
        if (now(config('app.timezone'))->gt($expiry)) {
            $expiry->addDay();
        }
        return $expiry;
    }

    /**
     * Executes the build ticket url operation.
     */
    private function buildTicketUrl(Request $request, string $token): string
    {
        $host = $request->getSchemeAndHttpHost();

        // If request comes from localhost or 127.0.0.1, resolve local LAN IP so mobile devices on Wi-Fi can open it
        if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
            $ip = gethostbyname(gethostname());
            if ($ip && $ip !== '127.0.0.1') {
                $scheme = $request->getScheme();
                $port = $request->getPort();
                $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';
                return "{$scheme}://{$ip}{$portStr}/ticket-status/{$token}";
            }
        }

        return "{$host}/ticket-status/{$token}";
    }

    /**
     * Generate a QR code PNG, persist it, and return the base64 string.
     * Returns [qr_code_path (relative), base64_string].
     */
    private function generateQr(string $token, string $ticketUrl): array
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

    /**
     * Executes the current user name operation.
     */
    private function currentUserName(Request $request): string
    {
        $userId = $request->session()->get('user_id');
        $user = $userId ? \App\Models\User::find($userId) : null;

        return $user ? $user->name : $request->session()->get('user_name', 'System');
    }

    /**
     * Executes the generate official receipt number operation.
     */
    private function generateOfficialReceiptNumber(): string
    {
        return 'OR-' . date('Ymd') . '-' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
    }

    // ─── Public: Online Ticket Submission ───────────────────────────────────

    /**
     * Store a newly created ticket (Public Client Submission).
     * POST /api/v1/tickets  and  POST /api/public/tickets
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'email'       => 'nullable|email|max:255',
            'phone'       => ['nullable', 'string', 'max:15', 'regex:/^[0-9+\-\s()]+$/'],
            'purpose'     => 'required|in:birth,death,marriage',
            'details'     => 'required|array',
        ], [
            'client_name.regex' => 'Name cannot contain numbers or invalid special characters (only letters, spaces, and . , - \' are allowed).',
            'phone.regex' => 'Phone number may only contain numbers and valid phone symbols (+, -, space, parens).',
            'phone.max'   => 'Phone number cannot exceed 15 characters.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors(), 'error' => $validator->errors()->first()], 422);
        }

        $limitsSetting = Setting::where('key', 'ticket_limits_enabled')->value('value');
        $limitsEnabled = ($limitsSetting !== '0');

        if ($limitsEnabled && ($request->email || $request->phone)) {
            $identifierQuery = function ($query) use ($request) {
                $query->where(function($q) use ($request) {
                    if ($request->email) {
                        $q->where('email', $request->email);
                    }
                    if ($request->phone) {
                        $q->orWhere('phone', $request->phone);
                    }
                });
            };

            $now = Carbon::now(config('app.timezone'));

            // Max 1 request per day
            $todayCount = Ticket::whereDate('created_at', Carbon::today(config('app.timezone')))
                ->where($identifierQuery)
                ->count();

            if ($todayCount >= 1) {
                $tomorrow = Carbon::tomorrow(config('app.timezone'));
                $diff = $now->diff($tomorrow);
                $hrs = $diff->h;
                $mins = $diff->i;
                $timeStr = ($hrs > 0 ? "{$hrs} hour(s) and " : "") . "{$mins} minute(s)";

                return response()->json([
                    'success' => false,
                    'error'   => "Request Limit Reached: You have already submitted a request today (Limit: 1 per day). You can submit your next request in {$timeStr} (at 12:00 AM tomorrow)."
                ], 429);
            }

            // Max 3 requests per week
            $sevenDaysAgo = Carbon::now(config('app.timezone'))->subDays(7);
            $weekCount = Ticket::where('created_at', '>=', $sevenDaysAgo)
                ->where($identifierQuery)
                ->count();

            if ($weekCount >= 3) {
                $oldestTicket = Ticket::where('created_at', '>=', $sevenDaysAgo)
                    ->where($identifierQuery)
                    ->orderBy('created_at', 'asc')
                    ->first();

                $availableAt = $oldestTicket ? Carbon::parse($oldestTicket->created_at)->addDays(7) : $now->copy()->addDays(7);
                $diff = $now->diff($availableAt);
                $days = $diff->d;
                $hrs = $diff->h;
                $mins = $diff->i;
                $timeStr = ($days > 0 ? "{$days} day(s), " : "") . ($hrs > 0 ? "{$hrs} hr(s), and " : "") . "{$mins} min";

                return response()->json([
                    'success' => false,
                    'error'   => "Weekly Limit Reached: You have reached the maximum limit of 3 requests per week. You can request again in {$timeStr} (on " . $availableAt->format('M j, Y \a\t g:i A') . ")."
                ], 429);
            }
        }

        try {
            return DB::transaction(function () use ($request) {
                $year  = date('Y');
                $count = DB::table('tickets')
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->count();

                $seq          = $count + 1;
                $ticketNumber = 'T-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
                $token        = Str::random(40);
                $expiry       = $this->buildExpiry();
                $ticketUrl    = $this->buildTicketUrl($request, $token);

                // Generate QR code PNG
                [$qrPath, $qrBase64] = $this->generateQr($token, $ticketUrl);

                $ticket = Ticket::create([
                    'ticket_number'  => $ticketNumber,
                    'client_name'    => $request->client_name,
                    'email'          => $request->email,
                    'phone'          => $request->phone,
                    'purpose'        => $request->purpose,
                    'details'        => $request->details,
                    'token'          => $token,
                    'qr_code_token'  => $token,
                    'request_status' => 'pending',
                    'queue_status'   => 'not_in_lobby',
                    'source'         => 'online',
                    'expires_at'     => $expiry,
                    'qr_code_path'   => $qrPath,
                ]);

                // Send email if provided (non-blocking)
                if ($request->email) {
                    try {
                        Mail::to($request->email)
                            ->send(new TicketConfirmation($ticket, $qrBase64, $ticketUrl));
                    } catch (\Exception $mailErr) {
                        \Log::warning('Ticket email failed: ' . $mailErr->getMessage());
                    }
                }

                DB::table('activity_logs')->insert([
                    'user_name' => 'System',
                    'action' => 'Ticket Created',
                    'record_type' => 'Ticket',
                    'record_id' => $ticket->id,
                    'details' => "Online ticket {$ticket->ticket_number} created for {$ticket->client_name}",
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

                return response()->json([
                    'success'       => true,
                    'ticket'        => $ticket,
                    'qr_code_url'   => Storage::url($qrPath),
                    'ticket_url'    => $ticketUrl,
                    'email_sent'    => (bool) $request->email,
                ], 201);
            });
        } catch (\Exception $e) {
            \Log::error('Ticket creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error'   => 'Could not generate ticket. Please try again.',
            ], 500);
        }
    }

    // ─── Staff: Walk-In Ticket ───────────────────────────────────────────────

    /**
     * Issue a walk-in ticket on behalf of a client who arrives without pre-booking.
     * POST /api/v1/tickets/walk-in  and  POST /api/tickets/walk-in
     */
    public function storeWalkIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\.\,\'\-\x{00F1}\x{00D1}\x{00C0}-\x{024F}]+$/u'],
            'email'       => 'nullable|email|max:255',
            'purpose'     => 'required|in:birth,death,marriage',
            'phone'       => ['nullable', 'string', 'max:15', 'regex:/^[0-9+\-\s()]+$/'],
            'details'     => 'nullable|array',
        ], [
            'client_name.regex' => 'Name cannot contain numbers or invalid special characters (only letters, spaces, and . , - \' are allowed).',
            'phone.regex' => 'Phone number may only contain numbers and valid phone symbols (+, -, space, parens).',
            'phone.max'   => 'Phone number cannot exceed 15 characters.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors(), 'error' => $validator->errors()->first()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $year  = date('Y');
                $count = DB::table('tickets')
                    ->where('source', 'walk_in')
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->count();

                $seq          = $count + 1;
                $ticketNumber = 'WI-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
                $token        = Str::random(40);
                $expiry       = $this->buildExpiry();
                $ticketUrl    = $this->buildTicketUrl($request, $token);

                [$qrPath, $qrBase64] = $this->generateQr($token, $ticketUrl);

                // Assign lobby sequence number starting at 101
                $start = Carbon::today(config('app.timezone'))->startOfDay();
                $end = Carbon::today(config('app.timezone'))->endOfDay();
                $todayCount = Ticket::whereBetween('created_at', [$start, $end])
                    ->whereNotNull('queue_number')
                    ->count();
                $queueNumber = $todayCount + 101;

                $ticket = Ticket::create([
                    'ticket_number'  => $ticketNumber,
                    'client_name'    => $request->client_name,
                    'email'          => $request->email,
                    'phone'          => $request->phone,
                    'purpose'        => $request->purpose,
                    'details'        => $request->details ?? [],
                    'token'          => $token,
                    'qr_code_token'  => $token,
                    'request_status' => 'pending', // Pending record attachment but in lobby!
                    'queue_status'   => 'waiting',
                    'queue_number'   => $queueNumber,
                    'source'         => 'walk_in',
                    'expires_at'     => $expiry,
                    'qr_code_path'   => $qrPath,
                    'verified_at'    => Carbon::now(),
                ]);

                // Send email if provided (non-blocking)
                if ($request->email) {
                    try {
                        Mail::to($request->email)
                            ->send(new TicketConfirmation($ticket, $qrBase64, $ticketUrl));
                    } catch (\Exception $mailErr) {
                        \Log::warning('Walk-in ticket email failed: ' . $mailErr->getMessage());
                    }
                }

                DB::table('activity_logs')->insert([
                    'user_name' => $this->currentUserName($request),
                    'action' => 'Walk-In Ticket Created',
                    'record_type' => 'Ticket',
                    'record_id' => $ticket->id,
                    'details' => "Walk-in ticket {$ticket->ticket_number} created for {$ticket->client_name}",
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

                return response()->json([
                    'success'     => true,
                    'ticket'      => $ticket,
                    'qr_code_url' => Storage::url($qrPath),
                    'qr_base64'   => $qrBase64,
                    'ticket_url'  => $ticketUrl,
                    'email_sent'  => (bool) $request->email,
                ], 201);
            });
        } catch (\Exception $e) {
            \Log::error('Walk-in ticket creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error'   => 'Could not generate walk-in ticket.',
            ], 500);
        }
    }

    // ─── Public: Ticket Status ───────────────────────────────────────────────

    /**
     * Retrieve ticket status & details (Public Status Check).
     * GET /api/v1/tickets/{token}  and  GET /api/public/tickets/{token}
     */
    public function showByToken($token)
    {
        $ticket = Ticket::with('document')
            ->where('qr_code_token', $token)
            ->orWhere('token', $token)
            ->first();

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        // Auto-expire: if past 5 PM and still pending, cancel
        if ($ticket->request_status === 'pending' && $ticket->isExpired()) {
            $ticket->request_status = 'cancelled';
            $ticket->queue_status = 'not_in_lobby';
            $ticket->save();
        }

        $queuePosition = 0;
        if ($ticket->queue_status === 'waiting') {
            $queuePosition = Ticket::where('queue_status', 'waiting')
                ->where('queue_number', '<', $ticket->queue_number)
                ->count() + 1;
        }

        $qrCodeUrl = null;
        if ($ticket->qr_code_path && Storage::disk('public')->exists($ticket->qr_code_path) && str_ends_with($ticket->qr_code_path, '.png')) {
            $qrCodeUrl = '/storage/' . ltrim($ticket->qr_code_path, '/');
        } else {
            $ticketUrl = $this->buildTicketUrl(request(), $ticket->token);
            [$qrPath, $qrBase64] = $this->generateQr($ticket->token, $ticketUrl);
            $ticket->qr_code_path = $qrPath;
            $ticket->save();
            $qrCodeUrl = '/storage/' . ltrim($qrPath, '/');
        }

        // Maintain compatibility mapping for status in UI
        $compatStatus = 'Pending';
        if ($ticket->request_status === 'completed') {
            $compatStatus = 'Completed';
        } elseif ($ticket->request_status === 'cancelled') {
            $compatStatus = 'Cancelled';
        } elseif ($ticket->queue_status === 'serving') {
            $compatStatus = 'Serving';
        }

        return response()->json([
            'ticket'         => array_merge($ticket->toArray(), ['status' => $compatStatus]),
            'queue_position' => $queuePosition,
            'qr_code_url'    => $qrCodeUrl,
            'is_expired'     => $ticket->request_status === 'cancelled' && $ticket->isExpired(),
        ]);
    }

    // ─── Staff: List Tickets ─────────────────────────────────────────────────

    /**
     * List tickets (Staff/Admin View with filters).
     * GET /api/v1/tickets  and  GET /api/tickets
     */
    public function index(Request $request)
    {
        $query = Ticket::query()->with('document');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'LIKE', "%{$search}%")
                  ->orWhere('client_name', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('purpose') && !empty($request->purpose) && $request->purpose !== 'all') {
            $query->where('purpose', $request->purpose);
        }

        if ($request->has('request_status') && !empty($request->request_status) && $request->request_status !== 'all') {
            $query->where('request_status', $request->request_status);
        }

        if ($request->has('queue_status') && !empty($request->queue_status) && $request->queue_status !== 'all') {
            $query->where('queue_status', $request->queue_status);
        }

        // Support legacy 'status' filter if passed by older UI
        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $status = strtolower($request->status);
            if ($status === 'pending') {
                $query->where('request_status', 'pending');
            } elseif ($status === 'serving') {
                $query->where('queue_status', 'serving');
            } elseif ($status === 'completed') {
                $query->where('request_status', 'completed');
            } elseif ($status === 'cancelled') {
                $query->where('request_status', 'cancelled');
            }
        }

        if ($request->has('source') && !empty($request->source) && $request->source !== 'all') {
            $query->where('source', $request->source);
        }

        $tickets = $query->orderByRaw("
            CASE
                WHEN queue_status = 'serving' THEN 1
                WHEN queue_status = 'waiting' THEN 2
                WHEN request_status = 'pending' THEN 3
                WHEN request_status = 'waiting_for_approval' THEN 4
                WHEN request_status = 'ready_for_pickup' THEN 5
                WHEN request_status = 'completed' THEN 6
                WHEN request_status = 'cancelled' THEN 7
                ELSE 8
            END
        ")->orderBy('created_at', 'asc');

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = min((int) $request->query('per_page', 20), 100);
            $paginated = $query->paginate($perPage);
            $paginated->getCollection()->transform(function ($ticket) {
                $ticket->qr_code_url = $ticket->qr_code_path
                    ? Storage::url($ticket->qr_code_path)
                    : null;
                $compatStatus = 'Pending';
                if ($ticket->request_status === 'completed') {
                    $compatStatus = 'Completed';
                } elseif ($ticket->request_status === 'cancelled') {
                    $compatStatus = 'Cancelled';
                } elseif ($ticket->queue_status === 'serving') {
                    $compatStatus = 'Serving';
                }
                $ticket->status = $compatStatus;
                return $ticket;
            });
            return response()->json($paginated);
        }

        $tickets = $query->get();

        // Attach QR URL and legacy compatibility 'status'
        $tickets->transform(function ($ticket) {
            $ticket->qr_code_url = $ticket->qr_code_path
                ? Storage::url($ticket->qr_code_path)
                : null;

            $compatStatus = 'Pending';
            if ($ticket->request_status === 'completed') {
                $compatStatus = 'Completed';
            } elseif ($ticket->request_status === 'cancelled') {
                $compatStatus = 'Cancelled';
            } elseif ($ticket->queue_status === 'serving') {
                $compatStatus = 'Serving';
            }
            $ticket->status = $compatStatus;

            return $ticket;
        });

        return response()->json($tickets);
    }

    /**
     * Digital Request Stats
     * GET /api/v1/tickets/digital-stats
     */
    public function digitalStats()
    {
        $start = Carbon::today(config('app.timezone'))->startOfDay();
        $end = Carbon::today(config('app.timezone'))->endOfDay();

        $pendingInbox = Ticket::where('request_status', 'pending')
            ->where('source', 'online')
            ->count();

        $attachedToday = Ticket::where('request_status', 'ready_for_pickup')
            ->where('source', 'online')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $completedToday = Ticket::where('request_status', 'completed')
            ->where('source', 'online')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        return response()->json([
            'pending_inbox' => $pendingInbox,
            'attached_today' => $attachedToday,
            'completed_today' => $completedToday,
        ]);
    }

    // ─── Staff: Update Status (Legacy compatibility) ─────────────────────────

    /**
     * Executes the update status operation.
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Pending,Serving,Completed,Cancelled,Expired'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        // Bridge state depending on selection
        switch (strtolower($request->status)) {
            case 'pending':
                $ticket->request_status = 'pending';
                $ticket->queue_status = 'waiting';
                break;
            case 'serving':
                $ticket->queue_status = 'serving';
                break;
            case 'completed':
                $ticket->request_status = 'completed';
                $ticket->queue_status = 'not_in_lobby';
                $ticket->issued_at = Carbon::now();
                break;
            case 'cancelled':
            case 'expired':
                $ticket->request_status = 'cancelled';
                $ticket->queue_status = 'not_in_lobby';
                break;
        }

        $ticket->save();

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    // ─── Staff: Link Document (Legacy compatibility) ─────────────────────────

    /**
     * Executes the link document operation.
     */
    public function linkDocument(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'document_id' => 'required|exists:documents,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        $ticket->document_id = $request->document_id;
        $ticket->request_status = 'completed';
        $ticket->queue_status = 'not_in_lobby';
        $ticket->issued_at = Carbon::now();
        $ticket->save();

        $this->syncIssuanceWithTicket($ticket, $request->document_id);

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    // ─── V1 Revamped Endpoints ──────────────────────────────────────────────

    /**
     * Staff accepts & links OCR record, marks request_status = 'ready_for_pickup'.
     * PATCH /api/v1/tickets/{id}/attach
     */
    public function attachDocument(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'document_id' => 'required|exists:documents,id',
            'print_remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        $ticket->document_id = $request->document_id;
        $ticket->request_status = 'ready_for_pickup';
        $ticket->save();

        $this->syncIssuanceWithTicket(
            $ticket,
            $request->document_id,
            $this->currentUserName($request),
            $request->print_remarks
        );

        DB::table('activity_logs')->insert([
            'user_name' => $this->currentUserName($request),
            'action' => 'Document Attached',
            'record_type' => 'Ticket',
            'record_id' => $ticket->id,
            'details' => "Document ID {$request->document_id} attached to ticket {$ticket->ticket_number}. Ticket ready for printing.",
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    /**
     * Staff declines/cancels a ticket.
     * PATCH /api/v1/tickets/{id}/cancel
     */
    public function cancelTicket(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string',
            'send_email' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        $ticket->request_status = 'cancelled';

        // Also cancel issuance if it exists
        $issuance = \Illuminate\Support\Facades\DB::table('issuances')
            ->where('ticket_number', $ticket->ticket_number)
            ->first();
            
        if ($issuance && $issuance->status !== 'completed') {
            \Illuminate\Support\Facades\DB::table('issuances')
                ->where('id', $issuance->id)
                ->update(['status' => 'cancelled', 'updated_at' => now()]);
        }

        // We can optionally store the cancellation reason in the details JSON
        $details = is_array($ticket->details) ? $ticket->details : [];
        $details['cancellation_reason'] = $request->reason;
        $ticket->details = $details;

        $ticket->save();

        if ($request->send_email && $ticket->email) {
            try {
                Mail::to($ticket->email)->send(new TicketDeclinedMail($ticket, $request->reason));
            } catch (\Exception $e) {
                \Log::error("Failed to send cancellation email to {$ticket->email}: " . $e->getMessage());
                // Proceed despite email failure
            }
        }

        DB::table('activity_logs')->insert([
            'user_name' => $this->currentUserName($request),
            'action' => 'Ticket Rejected/Cancelled',
            'record_type' => 'Ticket',
            'record_id' => $ticket->id,
            'details' => "Ticket {$ticket->ticket_number} cancelled. Reason: {$request->reason}",
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    /**
     * Auto-generates or updates an Issuance in the Print Approval Queue
     * using the citizen's form input from the Ticket.
     */
    private function syncIssuanceWithTicket(Ticket $ticket, $documentId, ?string $requestedBy = null, ?string $printRemarks = null)
    {
        $document = DB::table('documents')->where('id', $documentId)->first();
        if (!$document) return;

        $docType = $document->detected_type ?: $document->type;
        if ($docType === 'marriage_license') {
            $docType = 'marriage';
        }
        if (empty($docType) || strtolower($docType) === 'unknown') {
            $docType = $ticket->purpose;
        }

        $normCertType = 'birth';
        if ($docType === 'death') {
            $normCertType = 'death';
        } elseif ($docType === 'marriage' || $docType === 'marriage_license') {
            $normCertType = 'marriage';
        }

        $details = is_array($ticket->details) ? $ticket->details : [];
        $existingFields = json_decode($document->extracted_fields, true) ?: [];

        // Merge! The citizen's input takes precedence.
        $mergedFields = array_merge($existingFields, $details);
        $mergedData = json_encode($mergedFields, JSON_UNESCAPED_UNICODE);

        $personName = $ticket->client_name;
        $orNumber = $this->generateOfficialReceiptNumber();
        $requestedBy = $requestedBy ?: 'System';

        $existing = DB::table('issuances')
            ->where('document_id', $documentId)
            ->where('ticket_number', $ticket->ticket_number)
            ->first();

        if ($existing) {
            DB::table('issuances')
                ->where('id', $existing->id)
                ->update([
                    'ticket_number' => $ticket->ticket_number,
                    'extracted_data' => $mergedData,
                    'name' => $personName,
                    'status' => 'Approved',
                    'or_number' => $existing->or_number ?: $orNumber,
                    'print_remarks' => $printRemarks,
                    'requested_by' => $requestedBy,
                    'updated_at' => Carbon::now()
                ]);
        } else {
            $prefix = ($docType === 'death') ? 'DC' : (($docType === 'marriage' || $docType === 'marriage_license') ? 'ML' : 'BC');
            $year = date('Y');

            $results = DB::select("SELECT MAX(id) as max_id FROM issuances");
            $nextNum = 1;
            if (count($results) > 0 && $results[0]->max_id !== null) {
                $nextNum = intval($results[0]->max_id) + 1;
            }

            $certNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
            $issuanceDate = date('m/d/Y');

            DB::table('issuances')->insert([
                'certNumber' => $certNumber,
                'type' => $docType,
                'certificate_type' => $normCertType,
                'name' => $personName,
                'barangay' => $document->barangay ?: 'N/A',
                'issuanceDate' => $issuanceDate,
                'status' => 'Approved',
                'encoded_by' => 'System',
                'document_id' => $documentId,
                'extracted_data' => $mergedData,
                'or_number' => $orNumber,
                'print_remarks' => $printRemarks,
                'requested_by' => $requestedBy,
                'ticket_number' => $ticket->ticket_number,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
        }
    }

    /**
     * Kiosk check-in (scans or enters QR token).
     * POST /api/v1/tickets/scan
     */
    public function scanCheckIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'qr_code_token' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $ticket = Ticket::where('qr_code_token', $request->qr_code_token)
                    ->orWhere('token', $request->qr_code_token)
                    // Support older QR codes that contain the visible ticket number.
                    ->orWhere('ticket_number', $request->qr_code_token)
                    ->first();

                if (!$ticket) {
                    return response()->json([
                        'success' => false,
                        'error'   => 'Invalid or unrecognized QR token.'
                    ], 404);
                }

                if ($ticket->request_status === 'completed') {
                    return response()->json([
                        'success' => false,
                        'error'   => 'This request has already been completed and issued.'
                    ], 422);
                }

                if ($ticket->request_status === 'cancelled') {
                    return response()->json([
                        'success' => false,
                        'error'   => 'This request has been cancelled or has expired.'
                    ], 422);
                }

                if (!in_array($ticket->request_status, ['pending', 'ready_for_pickup'])) {
                    return response()->json([
                        'success' => false,
                        'error'   => 'This ticket is not eligible for lobby check-in.',
                        'request_status' => $ticket->request_status
                    ], 422);
                }

                if ($ticket->queue_status === 'waiting' || $ticket->queue_status === 'serving') {
                    return response()->json([
                        'success' => true,
                        'message' => 'You are already checked into the lobby queue.',
                        'ticket'  => $ticket
                    ]);
                }

                // Allocate daily lobby queue number starting at 101
                $start = Carbon::today(config('app.timezone'))->startOfDay();
                $end = Carbon::today(config('app.timezone'))->endOfDay();
                $todayCount = Ticket::whereBetween('verified_at', [$start, $end])
                    ->whereNotNull('queue_number')
                    ->count();
                $queueNumber = $todayCount + 101;

                $ticket->queue_status = 'waiting';
                $ticket->queue_number = $queueNumber;
                $ticket->verified_at  = Carbon::now();
                $ticket->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Check-in successful! Proceed to waiting area.',
                    'ticket'  => $ticket
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Kiosk check-in error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error'   => 'Could not complete check-in.'
            ], 500);
        }
    }

    /**
     * Final admin counter issuance verification.
     * POST /api/v1/tickets/{id}/issue
     */
    public function issueDocument(Request $request, $id)
    {
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found.'], 404);
        }

        if ($ticket->request_status === 'completed') {
            return response()->json(['error' => 'Document has already been issued.'], 422);
        }

        $ticket->request_status = 'completed';
        $ticket->queue_status   = 'not_in_lobby';
        $ticket->issued_at      = Carbon::now();
        $ticket->save();

        // Sync corresponding issuance status and ensure or_number/requested_by are generated/populated
        $userId = $request->session()->get('user_id');
        $dbUser = $userId ? \App\Models\User::find($userId) : null;
        $userName = $dbUser ? $dbUser->name : $request->session()->get('user_name', 'System');

        $issuancesQuery = DB::table('issuances');
        if ($ticket->ticket_number) {
            $issuancesQuery->where('ticket_number', $ticket->ticket_number);
            if ($ticket->document_id) {
                $issuancesQuery->orWhere('document_id', $ticket->document_id);
            }
        } elseif ($ticket->document_id) {
            $issuancesQuery->where('document_id', $ticket->document_id);
        }

        $issuances = $issuancesQuery->get();

        foreach ($issuances as $issuance) {
            $updateData = [
                'status' => 'Issued',
                'encoded_by' => $userName,
                'updated_at' => Carbon::now()
            ];

            if (empty($issuance->or_number)) {
                $updateData['or_number'] = 'OR-' . date('Ymd') . '-' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
            }

            if (empty($issuance->requested_by)) {
                $updateData['requested_by'] = $userName;
            }

            if (empty($issuance->ticket_number) && $ticket->ticket_number) {
                $updateData['ticket_number'] = $ticket->ticket_number;
            }

            DB::table('issuances')
                ->where('id', $issuance->id)
                ->update($updateData);
        }

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    /**
     * Get archived tickets (soft-deleted or cancelled)
     */
    public function archived(Request $request)
    {
        $deleted = Ticket::onlyTrashed()->with('document')->get();
        $declined = Ticket::where('request_status', 'cancelled')->with('document')->get();

        $all = $deleted->map(function ($t) {
            $t->archive_status = 'deleted';
            return $t;
        })->concat($declined->map(function ($t) {
            $t->archive_status = 'declined';
            return $t;
        }));

        $all->transform(function ($ticket) {
            $ticket->qr_code_url = $ticket->qr_code_path
                ? \Storage::url($ticket->qr_code_path)
                : null;

            $compatStatus = 'Pending';
            if ($ticket->request_status === 'completed') {
                $compatStatus = 'Completed';
            } elseif ($ticket->request_status === 'cancelled') {
                $compatStatus = 'Cancelled';
            } elseif ($ticket->queue_status === 'serving') {
                $compatStatus = 'Serving';
            }
            $ticket->status = $compatStatus;

            return $ticket;
        });

        return response()->json($all);
    }

    /**
     * Soft delete a ticket
     */
    public function destroy(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = Ticket::find($id);
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }
        if ($request->filled('reason')) {
            $details = is_array($ticket->details) ? $ticket->details : [];
            $details['deletion_reason'] = $request->reason;
            $details['cancellation_reason'] = $request->reason;
            $ticket->details = $details;
            $ticket->request_status = 'cancelled';
            $ticket->queue_status = 'not_in_lobby';
            $ticket->save();
        }
        $ticket->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Restore a soft-deleted or cancelled ticket
     */
    public function restore($id)
    {
        $ticket = Ticket::withTrashed()->find($id);
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        if ($ticket->trashed()) {
            $ticket->restore();
        }

        if ($ticket->request_status === 'cancelled') {
            $ticket->request_status = 'pending';
            $ticket->queue_status = 'not_in_lobby';
            $ticket->save();
        }

        return response()->json(['success' => true, 'ticket' => $ticket]);
    }

    /**
     * Permanently purge a ticket
     */
    public function purge($id)
    {
        $ticket = Ticket::withTrashed()->find($id);
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        if ($ticket->qr_code_path && Storage::disk('public')->exists($ticket->qr_code_path)) {
            Storage::disk('public')->delete($ticket->qr_code_path);
        }

        if ($ticket->trashed()) {
            $ticket->forceDelete();
        } else {
            $ticket->delete();
            $ticket->forceDelete();
        }

        return response()->json(['success' => true]);
    }
}
