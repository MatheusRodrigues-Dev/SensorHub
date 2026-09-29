<?php

namespace App\Http\Requests\Api\V1\Concerns;

use Illuminate\Validation\Validator;

trait RejectsUnknownFields
{
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), array_keys($this->rules())) as $field) {
                $validator->errors()->add($field, 'The field is not allowed.');
            }

            if ($this->isMethod('PATCH') && $this->all() === []) {
                $validator->errors()->add('request', 'At least one field is required.');
            }
        }];
    }
}
