<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\MeasurementIndexRequest;
use App\Http\Resources\MeasurementResource;
use App\Models\Measurement;
use App\Models\Sensor;
use Carbon\CarbonImmutable;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MeasurementController extends Controller
{
    public function index(MeasurementIndexRequest $request, Sensor $sensor): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Measurement::class, $sensor]);
        $filters = $request->validated();
        $query = $sensor->measurements();

        if (isset($filters['from'])) {
            $query->where('measured_at', '>=', CarbonImmutable::parse($filters['from'])->utc());
        }

        if (isset($filters['to'])) {
            $query->where('measured_at', '<=', CarbonImmutable::parse($filters['to'])->utc());
        }

        return MeasurementResource::collection(
            $query->orderBy('measured_at')->orderBy('id')->paginate($filters['per_page'] ?? 25),
        );
    }
}
