<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\RejectsUnknownFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDeviceRequest extends FormRequest
{
    use RejectsUnknownFields;

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:120'],
            'identifier' => ['sometimes', 'required', 'string', 'min:1', 'max:120'],
            'user_id' => ['prohibited'],
        ];
    }
}
