<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreDeviceCredentialRequest;
use App\Http\Resources\DeviceCredentialResource;
use App\Models\Device;
use App\Models\DeviceCredential;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class DeviceCredentialController extends Controller
{
    public function store(StoreDeviceCredentialRequest $request, Device $device): JsonResponse
    {
        Gate::authorize('create', [DeviceCredential::class, $device]);
        $token = DeviceCredential::generateToken();
        $credential = new DeviceCredential($request->validated());
        $credential->setPlaintextToken($token);
        $device->credentials()->save($credential);

        return $this->issued($credential, $token);
    }

    public function rotate(Device $device, DeviceCredential $credential): JsonResponse
    {
        Gate::authorize('rotate', $credential);

        [$replacement, $token] = DB::transaction(function () use ($credential): array {
            $current = DeviceCredential::query()->lockForUpdate()->findOrFail($credential->id);
            abort_if($current->revoked_at !== null, 409, 'Credential is already revoked.');

            $token = DeviceCredential::generateToken();
            $replacement = new DeviceCredential(['name' => $current->name]);
            $replacement->setPlaintextToken($token);
            $current->device->credentials()->save($replacement);
            $current->revoked_at = now('UTC');
            $current->save();

            return [$replacement, $token];
        });

        return $this->issued($replacement, $token);
    }

    public function destroy(Device $device, DeviceCredential $credential): Response
    {
        Gate::authorize('delete', $credential);

        if ($credential->revoked_at === null) {
            $credential->revoked_at = now('UTC');
            $credential->save();
        }

        return response()->noContent();
    }

    private function issued(DeviceCredential $credential, string $token): JsonResponse
    {
        return response()->json([
            'data' => [
                'credential' => (new DeviceCredentialResource($credential))->resolve(),
                'token' => $token,
            ],
        ], 201);
    }
}
