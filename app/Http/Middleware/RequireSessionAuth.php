<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;

/**
 * Represents the Require Session Auth application component.
 */
class RequireSessionAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->session()->get('user_id');
        $user = $userId ? User::find($userId) : null;
        if (!$userId || !$user || !$user->is_active) {
            if ($user && !$user->is_active) {
                $request->session()->forget('user_id');
                $request->session()->invalidate();
                return response()->json(['error' => 'This account has been disabled.'], 403);
            }
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
