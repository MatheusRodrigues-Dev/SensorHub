<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\DeviceCredential;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DeviceCredential>
 */
class DeviceCredentialFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'name' => 'Primary',
            'token_hash' => DeviceCredential::hashToken('sensorhub_'.bin2hex(random_bytes(32))),
            'last_used_at' => null,
            'expires_at' => null,
            'revoked_at' => null,
        ];
    }

    public function revoked(): static
    {
        return $this->state(fn (array $attributes) => [
            'revoked_at' => now(),
        ]);
    }
}
