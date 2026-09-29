<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeasurementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sensor_id' => $this->sensor_id,
            'value' => $this->value,
            'unit' => $this->unit,
            'measured_at' => $this->measured_at,
            'created_at' => $this->created_at,
        ];
    }
}
