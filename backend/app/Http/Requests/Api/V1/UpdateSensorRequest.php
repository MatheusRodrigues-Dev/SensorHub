<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\RejectsUnknownFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSensorRequest extends FormRequest
{
    use RejectsUnknownFields;

    public function rules(): array
    {
        return [
            'key' => ['prohibited'],
            'device_id' => ['prohibited'],
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:120'],
            'type' => ['sometimes', 'required', Rule::in(['temperature', 'humidity', 'pressure', 'generic'])],
            'unit' => ['sometimes', 'nullable', 'string', 'max:20'],
        ];
    }
}
