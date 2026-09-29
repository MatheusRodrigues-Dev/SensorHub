<?php

namespace App\Http\Requests\Api\V1;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Throwable;

class MeasurementIndexRequest extends FormRequest
{
    public function rules(): array
    {
        $timestamp = function (string $attribute, mixed $value, $fail): void {
            if (! is_string($value)
                || preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})\z/', $value) !== 1) {
                $fail('The field must be an ISO 8601 timestamp with a timezone.');

                return;
            }

            try {
                $parsed = CarbonImmutable::parse($value);
                if ($parsed->format('Y-m-d\TH:i:s') !== substr($value, 0, 19)) {
                    $fail('The field is not a valid calendar timestamp.');
                }
            } catch (Throwable) {
                $fail('The field is not a valid timestamp.');
            }
        };

        return [
            'from' => ['sometimes', $timestamp],
            'to' => ['sometimes', $timestamp],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['from', 'to', 'page', 'per_page']) as $field) {
                $validator->errors()->add($field, 'The field is not allowed.');
            }

            if ($validator->errors()->isEmpty() && $this->filled('from') && $this->filled('to')
                && CarbonImmutable::parse($this->input('from'))->utc()->greaterThan(
                    CarbonImmutable::parse($this->input('to'))->utc(),
                )) {
                $validator->errors()->add('to', 'The end timestamp must be on or after the start timestamp.');
            }
        }];
    }
}
