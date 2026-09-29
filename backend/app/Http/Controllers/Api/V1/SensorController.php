<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSensorRequest;
use App\Http\Requests\Api\V1\UpdateSensorRequest;
use App\Http\Resources\SensorResource;
use App\Models\Device;
use App\Models\Sensor;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class SensorController extends Controller
{
    public function index(Device $device): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Sensor::class, $device]);

        return SensorResource::collection($device->sensors()->orderBy('id')->get());
    }

    public function store(StoreSensorRequest $request, Device $device): JsonResponse
    {
        Gate::authorize('create', [Sensor::class, $device]);

        try {
            $sensor = $device->sensors()->create($request->validated());
        } catch (QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) === 1062) {
                abort(409, 'Sensor key is already in use on this device.');
            }

            throw $exception;
        }

        return (new SensorResource($sensor))->response()->setStatusCode(201);
    }

    public function show(Device $device, Sensor $sensor): SensorResource
    {
        Gate::authorize('view', $sensor);

        return new SensorResource($sensor);
    }

    public function update(UpdateSensorRequest $request, Device $device, Sensor $sensor): SensorResource
    {
        Gate::authorize('update', $sensor);
        $data = $request->validated();

        if (array_key_exists('unit', $data)
            && $data['unit'] !== $sensor->unit
            && $sensor->measurements()->exists()) {
            abort(409, 'Sensor unit cannot change after measurements exist.');
        }

        $sensor->update($data);

        return new SensorResource($sensor);
    }

    public function destroy(Device $device, Sensor $sensor): Response
    {
        Gate::authorize('delete', $sensor);
        $sensor->delete();

        return response()->noContent();
    }
}
