<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\RejectsUnknownFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSensorRequest extends FormRequest
{
    use RejectsUnknownFields;

    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9_-]+$/'],
            'name' => ['required', 'string', 'min:1', 'max:120'],
            'type' => ['required', Rule::in(['temperature', 'humidity', 'pressure', 'generic'])],
            'unit' => ['sometimes', 'nullable', 'string', 'max:20'],
            'device_id' => ['prohibited'],
        ];
    }
}
