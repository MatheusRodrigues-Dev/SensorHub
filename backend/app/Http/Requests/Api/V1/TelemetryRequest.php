<?php

namespace App\Http\Requests\Api\V1;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Throwable;

class TelemetryRequest extends FormRequest
{
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['measurements']) as $field) {
                $validator->errors()->add($field, 'The field is not allowed.');
            }
        }];
    }

    public function rules(): array
    {
        return [
            'measurements' => ['required', 'array', 'min:1', 'max:100'],
            'measurements.*' => ['required', 'array:sensor_key,value,unit,measured_at'],
            'measurements.*.sensor_key' => ['required', 'string', 'min:1', 'max:80', 'regex:/^[a-z0-9_-]+$/'],
            'measurements.*.value' => ['required', function (string $attribute, mixed $value, $fail): void {
                if ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value)) {
                    $fail('The value must be a finite JSON number.');
                }
            }],
            'measurements.*.unit' => ['sometimes', 'nullable', 'string', 'max:20'],
            'measurements.*.measured_at' => ['required', function (string $attribute, mixed $value, $fail): void {
                if (! is_string($value)
                    || preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})\z/', $value) !== 1) {
                    $fail('The measured_at field must be an ISO 8601 timestamp with a timezone.');

                    return;
                }

                try {
                    $parsed = CarbonImmutable::parse($value);
                    if ($parsed->format('Y-m-d\TH:i:s') !== substr($value, 0, 19)) {
                        $fail('The measured_at field is not a valid calendar timestamp.');
                    }
                } catch (Throwable) {
                    $fail('The measured_at field is not a valid timestamp.');
                }
            }],
        ];
    }
}
