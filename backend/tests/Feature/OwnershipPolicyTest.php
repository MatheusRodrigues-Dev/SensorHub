<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceCredential;
use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OwnershipPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_policies_follow_device_ownership_across_the_domain_graph(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();
        $sensor = Sensor::factory()->for($device)->create();
        $credential = DeviceCredential::factory()->for($device)->create();
        $measurement = Measurement::factory()->for($sensor)->create();
        $otherDevice = Device::factory()->for($other)->create();
        $otherSensor = Sensor::factory()->for($otherDevice)->create();
        $otherCredential = DeviceCredential::factory()->for($otherDevice)->create();
        $otherMeasurement = Measurement::factory()->for($otherSensor)->create();

        foreach ([$device, $sensor, $credential, $measurement] as $resource) {
            $this->assertTrue(Gate::forUser($owner)->allows('view', $resource));
            $this->assertFalse(Gate::forUser($other)->allows('view', $resource));
        }

        foreach ([$otherDevice, $otherSensor, $otherCredential, $otherMeasurement] as $resource) {
            $this->assertTrue(Gate::forUser($other)->allows('view', $resource));
            $this->assertFalse(Gate::forUser($owner)->allows('view', $resource));
        }

        foreach ([$device, $sensor] as $resource) {
            $this->assertTrue(Gate::forUser($owner)->allows('update', $resource));
            $this->assertFalse(Gate::forUser($other)->allows('update', $resource));
            $this->assertTrue(Gate::forUser($owner)->allows('delete', $resource));
            $this->assertFalse(Gate::forUser($other)->allows('delete', $resource));
        }

        $this->assertTrue(Gate::forUser($owner)->allows('rotate', $credential));
        $this->assertFalse(Gate::forUser($other)->allows('rotate', $credential));
        $this->assertTrue(Gate::forUser($owner)->allows('delete', $credential));
        $this->assertFalse(Gate::forUser($other)->allows('delete', $credential));

        foreach ([Sensor::class, DeviceCredential::class] as $modelClass) {
            $this->assertTrue(Gate::forUser($owner)->allows('create', [$modelClass, $device]));
            $this->assertFalse(Gate::forUser($other)->allows('create', [$modelClass, $device]));
        }

        $this->assertTrue(Gate::forUser($owner)->allows('viewAny', [Measurement::class, $sensor]));
        $this->assertFalse(Gate::forUser($other)->allows('viewAny', [Measurement::class, $sensor]));
    }

    public function test_unrelated_user_receives_json_403_from_policy_decision(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = Device::factory()->for($owner)->create();

        Route::get('/api/v1/test-ownership', function () use ($device): void {
            Gate::authorize('view', $device);
        })->middleware('auth:web');

        $this->actingAs($other, 'web')
            ->withHeader('Origin', 'http://localhost')
            ->getJson('/api/v1/test-ownership')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }
}
