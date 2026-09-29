<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\Sensor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Sensor>
 */
class SensorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'key' => 'channel_'.Str::lower(Str::random(12)),
            'name' => 'Generic Channel',
            'type' => 'generic',
            'unit' => null,
        ];
    }

    public function temperature(): static
    {
        return $this->state(fn (array $attributes) => [
            'key' => 'temperature',
            'name' => 'Temperature',
            'type' => 'temperature',
            'unit' => '°C',
        ]);
    }
}
