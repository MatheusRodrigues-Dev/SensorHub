<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceCredential;
use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceSensorApiTest extends TestCase
{
    use RefreshDatabase;

    private function asUser(User $user): void
    {
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost');
    }

    public function test_device_crud_is_owned_and_dependency_deletion_is_conflict(): void
    {
        $this->getJson('/api/v1/devices')->assertUnauthorized();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $foreign = Device::factory()->for($other)->create();
        $this->asUser($owner);

        $this->postJson('/api/v1/devices', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'identifier']);
        $this->postJson('/api/v1/devices', ['name' => 'Mine', 'identifier' => 'mine-1', 'secret' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('secret');
        $this->postJson('/api/v1/devices', ['name' => 'Mine', 'identifier' => 'mine-1', 'user_id' => $other->id])
            ->assertUnprocessable()->assertJsonValidationErrors('user_id');
        $created = $this->postJson('/api/v1/devices', ['name' => 'Mine', 'identifier' => 'mine-1'])
            ->assertCreated()->assertJsonPath('data.name', 'Mine')->json('data');
        $this->assertSame($owner->id, Device::findOrFail($created['id'])->user_id);
        $this->assertArrayNotHasKey('user_id', $created);
        $this->getJson('/api/v1/devices')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/devices?per_page=101')->assertUnprocessable();
        $this->getJson("/api/v1/devices/{$foreign->id}")->assertForbidden();
        $this->patchJson("/api/v1/devices/{$foreign->id}", ['name' => 'Stolen'])->assertForbidden();
        $this->deleteJson("/api/v1/devices/{$foreign->id}")->assertForbidden();
        $this->getJson("/api/v1/devices/{$created['id']}")->assertOk();
        $this->patchJson("/api/v1/devices/{$created['id']}", ['name' => 'Renamed'])
            ->assertOk()->assertJsonPath('data.name', 'Renamed');
        $this->patchJson("/api/v1/devices/{$created['id']}", [])->assertUnprocessable();
        $this->postJson('/api/v1/devices', ['name' => 'Again', 'identifier' => 'mine-1'])->assertStatus(409);

        $device = Device::findOrFail($created['id']);
        DeviceCredential::factory()->for($device)->create();
        $this->deleteJson("/api/v1/devices/{$device->id}")->assertStatus(409)
            ->assertDontSee('SQLSTATE');
        $this->assertDatabaseHas('devices', ['id' => $device->id]);
        $empty = Device::factory()->for($owner)->create();
        $this->deleteJson("/api/v1/devices/{$empty->id}")->assertNoContent();
        $this->assertDatabaseMissing('devices', ['id' => $empty->id]);
    }

    public function test_sensor_scoping_immutability_and_soft_delete(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();
        $another = Device::factory()->for($owner)->create();
        $foreignDevice = Device::factory()->for($other)->create();
        $foreignSensor = Sensor::factory()->for($foreignDevice)->create();
        $this->asUser($owner);

        $payload = ['key' => 'temperature', 'name' => 'Temperature', 'type' => 'temperature', 'unit' => '°C'];
        $this->postJson("/api/v1/devices/{$device->id}/sensors", [])->assertUnprocessable();
        $this->postJson("/api/v1/devices/{$device->id}/sensors", [...$payload, 'unknown' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('unknown');
        $sensor = $this->postJson("/api/v1/devices/{$device->id}/sensors", $payload)
            ->assertCreated()->assertJsonPath('data.key', 'temperature')->json('data');
        $this->assertArrayNotHasKey('deleted_at', $sensor);
        $this->postJson("/api/v1/devices/{$device->id}/sensors", $payload)->assertStatus(409);
        $this->postJson("/api/v1/devices/{$another->id}/sensors", $payload)->assertCreated();
        $this->getJson("/api/v1/devices/{$device->id}/sensors")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/devices/{$foreignDevice->id}/sensors")->assertForbidden();
        $this->postJson("/api/v1/devices/{$foreignDevice->id}/sensors", $payload)->assertForbidden();
        $this->getJson("/api/v1/devices/{$foreignDevice->id}/sensors/{$foreignSensor->id}")->assertForbidden();
        $this->patchJson("/api/v1/devices/{$foreignDevice->id}/sensors/{$foreignSensor->id}", ['name' => 'Stolen'])
            ->assertForbidden();
        $this->getJson("/api/v1/devices/{$another->id}/sensors/{$sensor['id']}")->assertNotFound();
        $this->getJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}")->assertOk();
        $this->patchJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}", ['key' => 'new_key'])
            ->assertUnprocessable()->assertJsonValidationErrors('key');
        $this->patchJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}", ['name' => 'Room', 'unit' => '°F'])
            ->assertOk()->assertJsonPath('data.name', 'Room')->assertJsonPath('data.unit', '°F');
        $model = Sensor::findOrFail($sensor['id']);
        $measurement = Measurement::factory()->for($model)->create();
        $this->patchJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}", ['unit' => 'K'])
            ->assertStatus(409);
        $this->patchJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}", ['name' => 'Ambient'])
            ->assertOk();
        $this->deleteJson("/api/v1/devices/{$foreignDevice->id}/sensors/{$foreignSensor->id}")->assertForbidden();
        $this->deleteJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}")->assertNoContent();
        $this->assertSoftDeleted('sensors', ['id' => $sensor['id']]);
        $this->assertDatabaseHas('measurements', ['id' => $measurement->id]);
        $this->getJson("/api/v1/devices/{$device->id}/sensors/{$sensor['id']}")->assertNotFound();
        $this->getJson("/api/v1/devices/{$device->id}/sensors")->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/devices/{$device->id}/sensors", $payload)->assertStatus(409);
    }
}
