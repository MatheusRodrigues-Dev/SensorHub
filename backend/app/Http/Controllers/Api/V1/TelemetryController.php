<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\StoreTelemetryBatchAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\TelemetryRequest;
use App\Models\Device;
use Illuminate\Http\JsonResponse;

class TelemetryController extends Controller
{
    public function store(TelemetryRequest $request, Device $device, StoreTelemetryBatchAction $store): JsonResponse
    {
        abort_unless($device->is($request->attributes->get('authenticatedDevice')), 404);

        $accepted = $store->execute(
            $device,
            $request->attributes->get('deviceCredential'),
            $request->validated('measurements'),
        );

        return response()->json(['accepted' => $accepted], 201);
    }
}
