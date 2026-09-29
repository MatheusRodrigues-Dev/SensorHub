<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\RejectsUnknownFields;
use Illuminate\Foundation\Http\FormRequest;

class StoreDeviceCredentialRequest extends FormRequest
{
    use RejectsUnknownFields;

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:120'],
        ];
    }
}
