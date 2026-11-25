<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use App\Models\RegistryBirth;
use App\Models\RegistryDeath;
use App\Models\RegistryMarriage;
use App\Support\EncryptedJson;

/**
 * Unified controller for Registry Database (Birth, Death, Marriage).
 */
class RegistryController extends Controller
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
            default => throw new \InvalidArgumentException("Invalid registry type: {$type}"),
        };
    }

    /**
     * Get the table name for a given type.
     */
    private function getTable(string $type): string
    {
        return match (strtolower($type)) {
            'birth' => 'registry_births',
            'death' => 'registry_deaths',
            'marriage' => 'registry_marriages',
            default => throw new \InvalidArgumentException("Invalid registry type: {$type}"),
        };
    }

    /**
     * Get all registry records with pagination.
     */
    public function index(Request $request)
    {
        $type = $request->query('type', 'all');
        $page = (int) $request->query('page', 1);
        $perPage = min((int) $request->query('per_page', 20), 500);
        $search = $request->query('search', '');
        $status = $request->query('status', 'active');

        if ($type === 'all' || empty($type)) {
            $types = ['birth', 'death', 'marriage'];
            $allRecords = collect();

            foreach ($types as $t) {
                $model = $this->getModel($t);
                $query = $model::query();

                if ($status === 'active') {
                    $query->where('status', 'active');
                } elseif ($status === 'archived') {
                    $query->where('status', 'archived');
                } elseif ($status !== 'all') {
                    $query->where('status', $status);
                }

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
                    $record->certificate_type = $t;
                    return $record;
                });

                $allRecords = $allRecords->concat($records);
            }

            // Sort by created_at descending
            $sorted = $allRecords->sortByDesc(function ($item) {
                return $item->created_at ? $item->created_at->timestamp : 0;
            })->values();

            $total = $sorted->count();
            $paginated = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

            return response()->json([
                'data' => $paginated,
                'total' => $total,
                'current_page' => $page,
                'per_page' => $perPage,
                'last_page' => (int) ceil($total / max($perPage, 1)),
            ]);
        }

        $model = $this->getModel($type);
        $table = $this->getTable($type);

        $query = $model::query();

        if ($status === 'active') {
            $query->where('status', 'active');
        } elseif ($status === 'archived') {
            $query->where('status', 'archived');
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('barangay', 'LIKE', "%{$search}%")
                    ->orWhere('certNumber', 'LIKE', "%{$search}%")
                    ->orWhere('registry_number', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        // Transform for frontend compatibility
        $records->getCollection()->transform(function ($record) use ($type) {
            $record->type = $type;
            $record->certificate_type = $type;
            return $record;
        });

        return response()->json($records);
    }

    /**
     * Get a single registry record.
     */
    public function show(Request $request, string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::with('document')->findOrFail($id);
        $record->type = $type;
        $record->certificate_type = $type;
        return response()->json($record);
    }

    /**
     * Create a new registry record (from document approval).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:birth,death,marriage',
            'certNumber' => 'required|string|max:255',
            'registry_number' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'issuanceDate' => 'required|date',
            'encoded_by' => 'nullable|string|max:255',
            'extracted_data' => 'nullable|array',
            'file_path' => 'nullable|string',
            'image_path' => 'nullable|string',
            'document_id' => 'nullable|exists:documents,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $type = $request->input('type');
        $model = $this->getModel($type);

        // Check duplicate certNumber
        if ($model::where('certNumber', $request->certNumber)->exists()) {
            return response()->json(['error' => 'Certificate number already exists'], 409);
        }

        $data = $request->only([
            'certNumber',
            'registry_number',
            'name',
            'barangay',
            'issuanceDate',
            'encoded_by',
            'extracted_data',
            'file_path',
            'image_path',
            'document_id',
        ]);
        $data['status'] = 'active';

        $record = $model::create($data);

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true, 'id' => $record->id, 'record' => $record]);
    }

    /**
     * Update a registry record.
     */
    public function update(Request $request, string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'certNumber' => 'nullable|string|max:255',
            'registry_number' => 'nullable|string|max:255',
            'name' => 'nullable|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'issuanceDate' => 'nullable|date',
            'status' => 'nullable|string|in:active,archived',
            'encoded_by' => 'nullable|string|max:255',
            'extracted_data' => 'nullable|array',
            'file_path' => 'nullable|string',
            'image_path' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $data = $request->only([
            'certNumber',
            'registry_number',
            'name',
            'barangay',
            'issuanceDate',
            'status',
            'encoded_by',
            'extracted_data',
            'file_path',
            'image_path',
        ]);

        if (empty($data)) {
            return response()->json(['error' => 'No fields to update'], 400);
        }

        $data['updated_at'] = now();
        $record->update($data);

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true, 'record' => $record->fresh()]);
    }

    /**
     * Archive (soft delete) a registry record.
     */
    public function destroy(Request $request, string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::findOrFail($id);

        $reason = $request->input('reason', 'archived');

        $record->update([
            'status' => 'archived',
            'archived_at' => now(),
            'archive_reason' => $reason,
            'updated_at' => now(),
        ]);

        // Also soft delete for extra safety
        $record->delete();

        // Log activity
        $userName = request()->session()->get('user_name')
            ?: (auth()->user()?->name ?? ($record->encoded_by ?? 'System'));
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => 'Archived',
            'record_type' => ucfirst($type),
            'record_id' => $id,
            'details' => "Archived {$type} record #{$id} ({$record->name}) - {$reason}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true]);
    }

    /**
     * Restore an archived registry record.
     */
    public function restore(string $type, int $id)
    {
        $model = $this->getModel($type);
        $record = $model::withTrashed()->findOrFail($id);

        if ($record->status !== 'archived') {
            return response()->json(['error' => 'Record is not archived'], 400);
        }

        $record->update([
            'status' => 'active',
            'archived_at' => null,
            'archive_reason' => null,
            'updated_at' => now(),
        ]);

        // Restore soft delete
        if ($record->trashed()) {
            $record->restore();
        }

        // Log activity
        $userName = request()->session()->get('user_name')
            ?: (auth()->user()?->name ?? ($record->encoded_by ?? 'System'));
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => 'Restored',
            'record_type' => ucfirst($type),
            'record_id' => $id,
            'details' => "Restored {$type} record #{$id} ({$record->name})",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true, 'record' => $record->fresh()]);
    }

    /**
     * Permanently purge a registry record.
     */
    public function purge(string $type, int $id)
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

        // Log activity before deletion
        $userName = request()->session()->get('user_name')
            ?: (auth()->user()?->name ?? ($record->encoded_by ?? 'System'));
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => 'Purged',
            'record_type' => ucfirst($type),
            'record_id' => $id,
            'details' => "Permanently purged {$type} record #{$id} ({$record->name})",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Force delete
        $record->forceDelete();

        Cache::forget('dashboard_stats_cache');

        return response()->json(['success' => true]);
    }

    /**
     * Get next certificate number for a type.
     */
    public function nextCertNumber(string $type)
    {
        $model = $this->getModel($type);
        $latest = $model::orderBy('certNumber', 'desc')->first();

        if (!$latest || !preg_match('/^(\d+)-(\d+)-(\d+)$/', $latest->certNumber, $matches)) {
            $year = date('Y');
            $nextNum = 1;
        } else {
            $year = (int)$matches[1];
            $currentYear = (int)date('Y');
            if ($year !== $currentYear) {
                $year = $currentYear;
                $nextNum = 1;
            } else {
                $nextNum = (int)$matches[3] + 1;
            }
        }

        $certNumber = sprintf('%d-%04d-%05d', $year, 0, $nextNum);

        return response()->json(['success' => true, 'certNumber' => $certNumber]);
    }

    /**
     * Search and retrieve registry records ready to be attached to a ticket.
     * GET /api/registry/for-attach
     */
    public function forAttach(Request $request)
    {
        $type = $request->query('type');
        $search = trim((string) $request->query('search', ''));
        $perPage = min((int) $request->query('per_page', 50), 100);

        $types = in_array(strtolower((string) $type), ['birth', 'death', 'marriage'], true)
            ? [strtolower((string) $type)]
            : ['birth', 'death', 'marriage'];

        $terms = array_values(array_filter(preg_split('/\s+/', $search)));
        $allRecords = collect();

        foreach ($types as $t) {
            $model = $this->getModel($t);
            $query = $model::query()
                ->where('status', 'active')
                ->whereNotNull('document_id');

            if (!empty($terms)) {
                $query->where(function ($subQ) use ($terms) {
                    foreach ($terms as $term) {
                        $wildcard = "%{$term}%";
                        $subQ->where(function ($matchQ) use ($wildcard) {
                            $matchQ->where('name', 'LIKE', $wildcard)
                                ->orWhere('certNumber', 'LIKE', $wildcard)
                                ->orWhere('registry_number', 'LIKE', $wildcard)
                                ->orWhere('barangay', 'LIKE', $wildcard);
                        });
                    }
                });
            }

            $records = $query->orderBy('created_at', 'desc')
                ->limit($perPage)
                ->get()
                ->map(function ($record) use ($t) {
                    return [
                        'id' => $record->id,
                        'document_id' => $record->document_id,
                        'name' => $record->name,
                        'personName' => $record->name,
                        'certNumber' => $record->certNumber,
                        'registry_number' => $record->registry_number,
                        'barangay' => $record->barangay,
                        'type' => $t,
                        'detected_type' => $t,
                        'created_at' => $record->created_at ? $record->created_at->toIso8601String() : null,
                    ];
                });

            $allRecords = $allRecords->concat($records);
        }

        // Sort combined results by created_at descending
        $sorted = $allRecords->sortByDesc(function ($item) {
            return $item['created_at'] ? strtotime($item['created_at']) : 0;
        })->values()->take($perPage);

        return response()->json([
            'success' => true,
            'data' => $sorted,
            'total' => $sorted->count(),
        ]);
    }
}
