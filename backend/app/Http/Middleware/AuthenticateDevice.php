<?php

namespace App\Http\Middleware;

use App\Models\Device;
use App\Models\DeviceCredential;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! is_string($token) || preg_match('/\Asensorhub_[A-Za-z0-9_-]{43}\z/', $token) !== 1) {
            abort(401, 'Unauthenticated.');
        }

        $credential = DeviceCredential::query()
            ->where('token_hash', DeviceCredential::hashToken($token))
            ->first();

        if ($credential === null || $credential->revoked_at !== null
            || ($credential->expires_at !== null && $credential->expires_at->isPast())) {
            abort(401, 'Unauthenticated.');
        }

        $request->attributes->set('deviceCredential', $credential);
        $request->attributes->set('authenticatedDevice', $credential->device);

        $routeDevice = $request->route('device');
        abort_unless($routeDevice instanceof Device && $routeDevice->is($credential->device), 404);

        return $next($request);
    }
}
