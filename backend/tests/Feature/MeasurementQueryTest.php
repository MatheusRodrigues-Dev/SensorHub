<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeasurementQueryTest extends TestCase
{
    use RefreshDatabase;

    private function endpoint(Sensor $sensor, string $query = ''): string
    {
        return "/api/v1/sensors/{$sensor->id}/measurements{$query}";
    }

    public function test_only_owner_can_read_active_or_deleted_sensor_history(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();
        $sensor = Sensor::factory()->for($device)->temperature()->create();
        $reading = Measurement::factory()->for($sensor)->create(['value' => 24.8]);
        $this->getJson($this->endpoint($sensor))->assertUnauthorized();

        $this->actingAs($other, 'web')->withHeader('Origin', 'http://localhost');
        $this->getJson($this->endpoint($sensor))->assertForbidden();

        $this->actingAs($owner, 'web');
        $this->getJson($this->endpoint($sensor))->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $reading->id)
            ->assertJsonPath('data.0.value', 24.8)->assertJsonPath('data.0.unit', '°C')
            ->assertJsonPath('meta.total', 1);
        $this->getJson("/api/v1/devices/{$device->id}/sensors/{$sensor->id}")->assertOk();

        $sensor->delete();
        $this->getJson($this->endpoint($sensor))->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/devices/{$device->id}/sensors/{$sensor->id}")->assertNotFound();
        $this->getJson("/api/v1/devices/{$device->id}/sensors")->assertJsonCount(0, 'data');
        $this->actingAs($other, 'web');
        $this->getJson($this->endpoint($sensor))->assertForbidden();
    }

    public function test_filters_are_inclusive_on_measured_time_with_stable_ascending_pagination(): void
    {
        $owner = User::factory()->create();
        $sensor = Sensor::factory()->for(Device::factory()->for($owner))->temperature()->create();
        $other = Sensor::factory()->for($sensor->device)->create();
        $times = [
            '2026-09-29T12:00:00Z',
            '2026-09-29T12:30:00Z',
            '2026-09-29T12:30:00Z',
            '2026-09-29T13:00:00Z',
        ];
        foreach ($times as $index => $time) {
            Measurement::factory()->for($sensor)->create([
                'value' => 20.0 + $index,
                'measured_at' => $time,
                'created_at' => '2026-09-29 15:00:00',
            ]);
        }
        Measurement::factory()->for($other)->create(['measured_at' => $times[1]]);
        $this->actingAs($owner, 'web')->withHeader('Origin', 'http://localhost');

        $first = $this->getJson($this->endpoint($sensor, '?per_page=2&page=1'))
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 4)
            ->assertJsonPath('meta.per_page', 2)->json('data');
        $second = $this->getJson($this->endpoint($sensor, '?per_page=2&page=2'))
            ->assertOk()->assertJsonCount(2, 'data')->json('data');
        $ids = array_column([...$first, ...$second], 'id');
        $expected = $sensor->measurements()->orderBy('measured_at')->orderBy('id')->pluck('id')->all();
        $this->assertSame($expected, $ids);

        $this->getJson($this->endpoint($sensor, '?from=2026-09-29T12:30:00Z'))
            ->assertOk()->assertJsonCount(3, 'data');
        $this->getJson($this->endpoint($sensor, '?to=2026-09-29T12:30:00Z'))
            ->assertOk()->assertJsonCount(3, 'data');
        $this->getJson($this->endpoint($sensor, '?from=2026-09-29T14:30:00%2B02:00&to=2026-09-29T12:30:00Z'))
            ->assertOk()->assertJsonCount(2, 'data');
        $this->getJson($this->endpoint($sensor, '?from=2026-09-30T00:00:00Z'))
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
    }

    public function test_invalid_range_and_page_size_return_json_validation_errors(): void
    {
        $owner = User::factory()->create();
        $sensor = Sensor::factory()->for(Device::factory()->for($owner))->create();
        $this->actingAs($owner, 'web')->withHeader('Origin', 'http://localhost');

        $this->getJson($this->endpoint($sensor, '?from=not-a-date'))
            ->assertUnprocessable()->assertJsonValidationErrors('from');
        $this->getJson($this->endpoint($sensor, '?to=2026-02-30T00:00:00Z'))
            ->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson($this->endpoint($sensor, '?from=2026-09-30T00:00:00Z&to=2026-09-29T00:00:00Z'))
            ->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson($this->endpoint($sensor, '?per_page=101'))
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
        $this->getJson($this->endpoint($sensor, '?unexpected=1'))
            ->assertUnprocessable()->assertJsonValidationErrors('unexpected');
    }
}
