<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\RegistryBirth;
use App\Models\RegistryDeath;
use App\Models\RegistryMarriage;
use App\Models\Ticket;

/**
 * Controller for Archive Manager - handles archived records across all types.
 */
class ArchiveController extends Controller
{
    /**
     * Get the model class for a given type.
     */
    private function getModel(string $type): string
    {
        return match (strtolower($type)) {
            'birth' => RegistryBirth::class,
            'death' => RegistryDeath::class,
            'marriage' => RegistryMarriage::class,
            default => throw new \InvalidArgumentException("Invalid archive type: {$type}"),
        };
    }

    /**
     * Get all archived records (registry + tickets) with pagination.
     */
    public function index(Request $request)
    {
        $type = $request->query('type', 'all');
        $page = (int) $request->query('page', 1);
        $perPage = min((int) $request->query('per_page', 20), 100);
        $search = $request->query('search', '');

        $results = [];

        // Get archived registry records
        if ($type === 'all' || in_array($type, ['birth', 'death', 'marriage'])) {
            $types = $type === 'all' ? ['birth', 'death', 'marriage'] : [$type];

            foreach ($types as $t) {
                $model = $this->getModel($t);
                $query = $model::withTrashed()
                    ->where('status', 'archived')
                    ->orderBy('archived_at', 'desc');

                if (!empty($search)) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('barangay', 'LIKE', "%{$search}%")
                            ->orWhere('certNumber', 'LIKE', "%{$search}%")
                            ->orWhere('registry_number', 'LIKE', "%{$search}%");
                    });
                }

                $records = $query->get()->map(function ($record) use ($t) {
                    $record->type = $t;
                    $record->archive_type = 'registry';
                    $record->archive_status = 'archived';
                    $record->deleted_at = $record->archived_at;
                    return $record;
                });

                $results = array_merge($results, $records->toArray());
            }
        }

        // Get archived tickets
        if ($type === 'all' || $type === 'tickets') {
            $deleted = Ticket::onlyTrashed()
                ->with('document')
                ->when($search, function ($q) use ($search) {
                    $q->where('client_name', 'LIKE', "%{$search}%")
                        ->orWhere('ticket_number', 'LIKE', "%{$search}%");
                })
                ->orderBy('deleted_at', 'desc')
                ->get()
                ->map(function ($t) {
                    $t->archive_type = 'ticket';
                    $t->archive_status = 'deleted';
                    return $t;
                });

            $cancelled = Ticket::where('request_status', 'cancelled')
                ->with('document')
                ->when($search, function ($q) use ($search) {
                    $q->where('client_name', 'LIKE', "%{$search}%")
                        ->orWhere('ticket_number', 'LIKE', "%{$search}%");
                })
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function ($t) {
                    $t->archive_type = 'ticket';
                    $t->archive_status = 'declined';
                    return $t;
                });

            $expired = Ticket::where('request_status', 'expired')
                ->with('document')
                ->when($search, function ($q) use ($search) {
                    $q->where('client_name', 'LIKE', "%{$search}%")
                        ->orWhere('ticket_number', 'LIKE', "%{$search}%");
                })
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function ($t) {
                    $t->archive_type = 'ticket';
                    $t->archive_status = 'expired';
                    return $t;
                });

            $results = array_merge($results, $deleted->toArray(), $cancelled->toArray(), $expired->toArray());
        }

        // Sort all by archive date
        usort($results, function ($a, $b) {
            $dateA = $a['deleted_at'] ?? $a['archived_at'] ?? $a['updated_at'] ?? '';
            $dateB = $b['deleted_at'] ?? $b['archived_at'] ?? $b['updated_at'] ?? '';
            return strtotime($dateB) - strtotime($dateA);
        });

        // Manual pagination
        $total = count($results);
        $offset = ($page - 1) * $perPage;
        $paginated = array_slice($results, $offset, $perPage);

        return response()->json([
            'data' => $paginated,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
            ]
        ]);
    }

    /**
     * Restore an archived registry record.
     */
    public function restoreRegistry(Request $request, string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::withTrashed()->findOrFail($id);

        // Allow restore if record is archived OR soft-deleted (trashed)
        // This handles edge cases where status may have changed but record is still in archive
        if ($record->status !== 'archived' && !$record->trashed()) {
            return response()->json(['error' => 'Record is not archived'], 400);
        }

        $record->update([
            'status' => 'active',
            'archived_at' => null,
            'archive_reason' => null,
            'updated_at' => now(),
        ]);

        if ($record->trashed()) {
            $record->restore();
        }

        $userName = request()->session()->get('user_name')
            ?: (auth()->user()?->name ?? ($record->encoded_by ?? 'System'));
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => 'Restored',
            'record_type' => ucfirst($type),
            'record_id' => $id,
            'details' => "Restored {$type} record #{$id} ({$record->name}) from archive",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true, 'record' => $record->fresh()]);
    }

    /**
     * Permanently purge an archived registry record.
     */
    public function purgeRegistry(Request $request, string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::withTrashed()->findOrFail($id);

        // Delete associated files
        if (!empty($record->file_path) && \Storage::disk('local')->exists($record->file_path)) {
            \Storage::disk('local')->delete($record->file_path);
        }
        if (!empty($record->image_path) && \Storage::disk('local')->exists($record->image_path)) {
            \Storage::disk('local')->delete($record->image_path);
        }

        $userName = request()->session()->get('user_name')
            ?: (auth()->user()?->name ?? ($record->encoded_by ?? 'System'));
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => 'Purged',
            'record_type' => ucfirst($type),
            'record_id' => $id,
            'details' => "Permanently purged {$type} record #{$id} ({$record->name}) from archive",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $record->forceDelete();

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true]);
    }

    /**
     * Restore an archived ticket.
     */
    public function restoreTicket(Request $request, int $id)
    {
        $ticket = Ticket::withTrashed()->findOrFail($id);

        if ($ticket->trashed()) {
            $ticket->restore();
        }

        if (in_array($ticket->request_status, ['cancelled', 'expired'])) {
            $ticket->request_status = 'pending';
            $ticket->queue_status = 'not_in_lobby';
            $ticket->expires_at = now()->addDay()->setTime(17, 0);
            $ticket->save();
        }

        return response()->json(['success' => true, 'ticket' => $ticket->load('document')]);
    }

    /**
     * Permanently purge an archived ticket.
     */
    public function purgeTicket(Request $request, int $id)
    {
        $ticket = Ticket::withTrashed()->findOrFail($id);

        if ($ticket->qr_code_path && \Storage::disk('public')->exists($ticket->qr_code_path)) {
            \Storage::disk('public')->delete($ticket->qr_code_path);
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