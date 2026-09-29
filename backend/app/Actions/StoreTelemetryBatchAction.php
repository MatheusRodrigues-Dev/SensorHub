<?php

namespace App\Actions;

use App\Models\Device;
use App\Models\DeviceCredential;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StoreTelemetryBatchAction
{
    public function execute(Device $device, DeviceCredential $credential, array $readings): int
    {
        return DB::transaction(function () use ($device, $credential, $readings): int {
            $current = DeviceCredential::query()->lockForUpdate()->findOrFail($credential->id);
            abort_if($current->revoked_at !== null
                || ($current->expires_at !== null && $current->expires_at->isPast()), 401, 'Unauthenticated.');

            $sensors = $device->sensors()
                ->whereIn('key', array_column($readings, 'sensor_key'))
                ->lockForUpdate()
                ->get()
                ->keyBy('key');
            $errors = [];
            $seen = [];

            foreach ($readings as $index => $reading) {
                $field = "measurements.{$index}";
                $sensor = $sensors->get($reading['sensor_key']);

                if ($sensor === null) {
                    $errors["{$field}.sensor_key"] = ['The sensor key is unavailable for this device.'];

                    continue;
                }

                if (array_key_exists('unit', $reading) && $reading['unit'] !== $sensor->unit) {
                    $errors["{$field}.unit"] = ['The unit does not match the sensor.'];
                }

                $instant = CarbonImmutable::parse($reading['measured_at'])->utc();
                $identity = $sensor->id.'|'.$instant->format('Y-m-d H:i:s.u');

                if (isset($seen[$identity])) {
                    $errors["{$field}.measured_at"] = ['The sensor and timestamp are duplicated in this batch.'];
                }

                $seen[$identity] = true;
            }

            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }

            foreach ($readings as $reading) {
                $sensor = $sensors->get($reading['sensor_key']);
                $sensor->measurements()->create([
                    'value' => $reading['value'],
                    'unit' => $sensor->unit,
                    'measured_at' => CarbonImmutable::parse($reading['measured_at'])->utc(),
                ]);
            }

            $current->last_used_at = now('UTC');
            $current->save();

            return count($readings);
        });
    }
}
