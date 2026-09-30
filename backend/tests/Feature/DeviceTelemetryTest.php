<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceCredential;
use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DeviceTelemetryTest extends TestCase
{
    use RefreshDatabase;

    private function reading(string $key = 'temperature', mixed $value = 24.8, string $at = '2026-09-29T12:30:00Z'): array
    {
        return ['sensor_key' => $key, 'value' => $value, 'measured_at' => $at];
    }

    private function send(Device $device, array $measurements, ?string $token = null): TestResponse
    {
        $headers = $token === null ? [] : ['Authorization' => 'Bearer '.$token];

        return $this->postJson("/api/v1/devices/{$device->id}/telemetry", ['measurements' => $measurements], $headers);
    }

    public function test_credential_lifecycle_is_owned_and_tokens_are_one_time_secrets(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();
        $foreign = Device::factory()->for($other)->create();
        $foreignCredential = DeviceCredential::factory()->for($foreign)->create();
        $this->postJson("/api/v1/devices/{$device->id}/credentials", ['name' => 'ESP32'])->assertUnauthorized();
        $this->actingAs($owner, 'web')->withHeader('Origin', 'http://localhost');
        $this->postJson("/api/v1/devices/{$foreign->id}/credentials", ['name' => 'ESP32'])->assertForbidden();
        $this->postJson("/api/v1/devices/{$foreign->id}/credentials/{$foreignCredential->id}/rotate")
            ->assertForbidden();
        $this->deleteJson("/api/v1/devices/{$foreign->id}/credentials/{$foreignCredential->id}")
            ->assertForbidden();
        $this->postJson("/api/v1/devices/{$device->id}/credentials", [])->assertUnprocessable();

        $issued = $this->postJson("/api/v1/devices/{$device->id}/credentials", ['name' => 'ESP32'])
            ->assertCreated()->json('data');
        $token = $issued['token'];
        $id = $issued['credential']['id'];
        $this->assertMatchesRegularExpression('/\Asensorhub_[A-Za-z0-9_-]{43}\z/', $token);
        $this->assertArrayNotHasKey('token_hash', $issued['credential']);
        $this->assertSame(DeviceCredential::hashToken($token), DB::table('device_credentials')->where('id', $id)->value('token_hash'));
        $this->assertSame(1, DB::table('device_credentials')->where('device_id', $device->id)->count());

        $second = $this->postJson("/api/v1/devices/{$device->id}/credentials", ['name' => 'Simulator'])
            ->assertCreated()->json('data');
        $this->assertNotSame($token, $second['token']);
        $this->postJson("/api/v1/devices/{$foreign->id}/credentials/{$id}/rotate")->assertNotFound();
        $rotated = $this->postJson("/api/v1/devices/{$device->id}/credentials/{$id}/rotate")
            ->assertCreated()->json('data');
        $this->assertNotSame($id, $rotated['credential']['id']);
        $this->assertNotSame($token, $rotated['token']);
        $this->assertNotNull(DeviceCredential::findOrFail($id)->revoked_at);
        $this->assertNull(DeviceCredential::findOrFail($second['credential']['id'])->revoked_at);
        $sensor = Sensor::factory()->for($device)->temperature()->create();
        $this->send($device, [$this->reading()], $token)->assertUnauthorized();
        $this->send($device, [$this->reading()], $rotated['token'])->assertCreated();
        $this->send($device, [$this->reading('temperature', 25.0, '2026-09-29T12:31:00Z')], $second['token'])
            ->assertCreated();
        $this->assertSame(2, $sensor->measurements()->count());
        $this->postJson("/api/v1/devices/{$device->id}/credentials/{$id}/rotate")->assertStatus(409);
        $this->deleteJson("/api/v1/devices/{$foreign->id}/credentials/{$second['credential']['id']}")->assertNotFound();
        $this->deleteJson("/api/v1/devices/{$device->id}/credentials/{$rotated['credential']['id']}")->assertNoContent();
        $this->deleteJson("/api/v1/devices/{$device->id}/credentials/{$rotated['credential']['id']}")->assertNoContent();
        $this->assertNotNull(DeviceCredential::findOrFail($rotated['credential']['id'])->revoked_at);
        $this->send($device, [$this->reading()], $rotated['token'])->assertUnauthorized();
    }

    public function test_credential_listing_contains_only_safe_metadata(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();
        $foreign = Device::factory()->for($other)->create();
        $token = DeviceCredential::generateToken();
        $credential = DeviceCredential::factory()->for($device)->make(['name' => 'Simulator']);
        $credential->setPlaintextToken($token);
        $credential->save();
        $revoked = DeviceCredential::factory()->for($device)->create(['revoked_at' => now('UTC')]);
        DeviceCredential::factory()->for($foreign)->create();

        $this->getJson("/api/v1/devices/{$device->id}/credentials")->assertUnauthorized();
        $this->actingAs($owner, 'web')->withHeader('Origin', 'http://localhost');
        $this->getJson("/api/v1/devices/{$foreign->id}/credentials")->assertForbidden();
        $response = $this->getJson("/api/v1/devices/{$device->id}/credentials")
            ->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $credential->id, 'name' => 'Simulator'])
            ->assertJsonFragment(['id' => $revoked->id]);
        $response->assertDontSee($token)->assertDontSee(DeviceCredential::hashToken($token));
        foreach ($response->json('data') as $item) {
            $this->assertArrayNotHasKey('token', $item);
            $this->assertArrayNotHasKey('token_hash', $item);
        }
    }

    public function test_device_bearer_authentication_and_atomic_telemetry(): void
    {
        $device = Device::factory()->create();
        $otherDevice = Device::factory()->create();
        $temperature = Sensor::factory()->for($device)->temperature()->create();
        $humidity = Sensor::factory()->for($device)->create(['key' => 'humidity', 'unit' => '%']);
        $token = DeviceCredential::generateToken();
        $credential = DeviceCredential::factory()->for($device)->make();
        $credential->setPlaintextToken($token);
        $credential->save();

        $this->send($device, [$this->reading()])->assertUnauthorized();
        $this->send($device, [$this->reading()], 'bad')->assertUnauthorized();
        $this->send($device, [$this->reading()], DeviceCredential::generateToken())->assertUnauthorized();
        $this->send($otherDevice, [$this->reading()], $token)->assertNotFound();
        $this->actingAs($device->user, 'web');
        $this->send($device, [$this->reading()])->assertUnauthorized();

        $batch = [
            [...$this->reading(), 'unit' => '°C'],
            $this->reading('temperature', 25.1, '2026-09-29T14:31:00+02:00'),
            [...$this->reading('humidity', 61.2), 'unit' => '%'],
        ];
        $this->send($device, $batch, $token)->assertCreated()->assertExactJson(['accepted' => 3]);
        $this->assertSame(3, Measurement::count());
        $this->assertSame(2, $temperature->measurements()->count());
        $this->assertSame(1, $humidity->measurements()->count());
        $stored = $temperature->measurements()->orderBy('measured_at')->firstOrFail();
        $this->assertSame('°C', $stored->unit);
        $this->assertSame('2026-09-29 12:30:00', $stored->measured_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-09-29 12:31:00', $temperature->measurements()->orderByDesc('measured_at')->firstOrFail()->measured_at->format('Y-m-d H:i:s'));
        $this->assertNotNull($credential->fresh()->last_used_at);
    }

    public function test_invalid_readings_leave_no_measurements_or_usage_update(): void
    {
        $device = Device::factory()->create();
        $sensor = Sensor::factory()->for($device)->temperature()->create();
        $token = DeviceCredential::generateToken();
        $credential = DeviceCredential::factory()->for($device)->make();
        $credential->setPlaintextToken($token);
        $credential->save();
        $valid = $this->reading();

        foreach ([
            [$valid, $this->reading('unknown')],
            [$valid, [...$this->reading('temperature', 25.0, '2026-09-29T12:31:00Z'), 'unit' => '°F']],
            [$valid, $valid],
            [$valid, $this->reading('temperature', 'not-a-number', '2026-09-29T12:31:00Z')],
            [$valid, $this->reading('temperature', '25.0', '2026-09-29T12:31:00Z')],
            [$valid, $this->reading('temperature', 25.0, '2026-02-30T12:31:00Z')],
        ] as $batch) {
            $this->send($device, $batch, $token)->assertUnprocessable();
            $this->assertSame(0, Measurement::count());
            $this->assertNull($credential->fresh()->last_used_at);
        }

        $sensor->delete();
        $this->send($device, [$valid], $token)->assertUnprocessable();
        $this->assertSame(0, Measurement::count());
        $credential->revoked_at = now();
        $credential->save();
        $this->send($device, [$valid], $token)->assertUnauthorized();

        $expiredToken = DeviceCredential::generateToken();
        $expired = DeviceCredential::factory()->for($device)->make(['expires_at' => now()->subMinute()]);
        $expired->setPlaintextToken($expiredToken);
        $expired->save();
        $this->send($device, [$valid], $expiredToken)->assertUnauthorized();
    }
}
