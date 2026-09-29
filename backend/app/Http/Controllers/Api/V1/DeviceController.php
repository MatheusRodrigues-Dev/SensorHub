<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreDeviceRequest;
use App\Http\Requests\Api\V1\UpdateDeviceRequest;
use App\Http\Resources\DeviceResource;
use App\Models\Device;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DeviceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Device::class);
        $query = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return DeviceResource::collection(
            $request->user()->devices()->orderBy('id')->paginate($query['per_page'] ?? 25),
        );
    }

    public function store(StoreDeviceRequest $request): JsonResponse
    {
        Gate::authorize('create', Device::class);

        try {
            $device = $request->user()->devices()->create($request->validated());
        } catch (QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) === 1062) {
                abort(409, 'Device identifier is already in use.');
            }

            throw $exception;
        }

        return (new DeviceResource($device))->response()->setStatusCode(201);
    }

    public function show(Device $device): DeviceResource
    {
        Gate::authorize('view', $device);

        return new DeviceResource($device);
    }

    public function update(UpdateDeviceRequest $request, Device $device): DeviceResource
    {
        Gate::authorize('update', $device);

        try {
            $device->update($request->validated());
        } catch (QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) === 1062) {
                abort(409, 'Device identifier is already in use.');
            }

            throw $exception;
        }

        return new DeviceResource($device);
    }

    public function destroy(Device $device): Response
    {
        Gate::authorize('delete', $device);

        try {
            $device->delete();
        } catch (QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) === 1451) {
                abort(409, 'Device has dependent records.');
            }

            throw $exception;
        }

        return response()->noContent();
    }
}
