<?php

namespace Database\Factories;

use App\Models\Measurement;
use App\Models\Sensor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Measurement>
 */
class MeasurementFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (Measurement $measurement): void {
            if ($measurement->unit === null && $measurement->sensor_id !== null) {
                $measurement->unit = $measurement->sensor()->value('unit');
            }
        });
    }

    public function definition(): array
    {
        return [
            'sensor_id' => Sensor::factory(),
            'value' => fake()->randomFloat(4, -100, 100),
            'unit' => null,
            'measured_at' => now()->subMinute(),
        ];
    }
}
