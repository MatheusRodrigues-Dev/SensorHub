<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireStatefulSpaSession
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->attributes->get('sanctum') === true, 419, 'SPA session required.');

        return $next($request);
    }
}
