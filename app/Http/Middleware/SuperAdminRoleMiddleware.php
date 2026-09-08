<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;

/**
 * Represents the Super Admin Role Middleware application component.
 */
class SuperAdminRoleMiddleware
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

        if (!$user || $user->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
