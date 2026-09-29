<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceCredential;
use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;
use Tests\TestCase;

class DomainPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_relationships_and_ulids_round_trip_through_mysql(): void
    {
        $user = User::factory()->has(
            Device::factory()->has(Sensor::factory()->has(Measurement::factory()))
                ->has(DeviceCredential::factory(), 'credentials')
        )->create();

        $device = $user->devices()->firstOrFail();
        $sensor = $device->sensors()->firstOrFail();
        $credential = $device->credentials()->firstOrFail();
        $measurement = $sensor->measurements()->firstOrFail();

        foreach ([$device, $sensor, $credential, $measurement] as $model) {
            $this->assertTrue(Str::isUlid($model->id));
            $this->assertSame($model->id, $model->fresh()->id);
        }

        $this->assertTrue($device->user->is($user));
        $this->assertTrue($sensor->device->is($device));
        $this->assertTrue($credential->device->is($device));
        $this->assertTrue($measurement->sensor->is($sensor));
        $this->assertTrue(Device::findOrFail($device->id)->is($device));
    }

    public function test_sensor_keys_are_unique_per_device_and_remain_reserved_after_soft_delete(): void
    {
        $firstDevice = Device::factory()->create();
        $secondDevice = Device::factory()->create();

        $sensor = Sensor::factory()->temperature()->for($firstDevice)->create();
        Sensor::factory()->temperature()->for($secondDevice)->create();

        $sensor->delete();

        $this->assertSoftDeleted($sensor);
        $this->assertCount(0, $firstDevice->sensors);

        $this->expectException(QueryException::class);
        Sensor::factory()->temperature()->for($firstDevice)->create();
    }

    public function test_sensor_key_cannot_be_changed_through_eloquent(): void
    {
        $sensor = Sensor::factory()->create();
        $sensor->key = 'other_key';

        $this->expectException(LogicException::class);
        $sensor->save();
    }

    public function test_database_rejects_orphan_domain_records(): void
    {
        $invalidId = (string) Str::ulid();

        $attempts = [
            fn () => DB::table('devices')->insert([
                'id' => (string) Str::ulid(), 'user_id' => 999999999,
                'name' => 'Orphan', 'identifier' => (string) Str::uuid(),
            ]),
            fn () => DB::table('sensors')->insert([
                'id' => (string) Str::ulid(), 'device_id' => $invalidId,
                'key' => 'temperature', 'name' => 'Temperature', 'type' => 'temperature',
            ]),
            fn () => DB::table('device_credentials')->insert([
                'id' => (string) Str::ulid(), 'device_id' => $invalidId,
                'name' => 'Orphan', 'token_hash' => str_repeat('a', 64),
            ]),
            fn () => DB::table('measurements')->insert([
                'id' => (string) Str::ulid(), 'sensor_id' => $invalidId,
                'value' => 24.8, 'measured_at' => now(),
            ]),
        ];

        foreach ($attempts as $attempt) {
            try {
                $attempt();
                $this->fail('An orphan record was accepted.');
            } catch (QueryException $exception) {
                $this->assertSame('23000', $exception->errorInfo[0]);
            }
        }
    }

    public function test_user_with_devices_cannot_be_physically_deleted(): void
    {
        $user = User::factory()->has(Device::factory())->create();

        $this->expectException(QueryException::class);
        $user->delete();
    }

    public function test_device_with_credentials_or_sensors_cannot_be_physically_deleted(): void
    {
        $deviceWithCredential = Device::factory()->has(DeviceCredential::factory(), 'credentials')->create();
        $deviceWithSensor = Device::factory()->has(Sensor::factory())->create();

        foreach ([$deviceWithCredential, $deviceWithSensor] as $device) {
            try {
                $device->delete();
                $this->fail('A device with children was deleted.');
            } catch (QueryException $exception) {
                $this->assertSame('23000', $exception->errorInfo[0]);
            }
        }
    }

    public function test_sensor_with_measurements_cannot_be_physically_deleted(): void
    {
        $sensor = Sensor::factory()->has(Measurement::factory())->create();
        $sensor->delete();

        $this->assertSoftDeleted($sensor);
        $this->assertDatabaseHas('measurements', ['sensor_id' => $sensor->id]);

        $this->expectException(QueryException::class);
        $sensor->forceDelete();
    }

    public function test_credential_can_be_deleted_without_deleting_device(): void
    {
        $credential = DeviceCredential::factory()->create();
        $device = $credential->device;

        $credential->delete();

        $this->assertDatabaseMissing('device_credentials', ['id' => $credential->id]);
        $this->assertDatabaseHas('devices', ['id' => $device->id]);
    }

    public function test_credentials_store_only_hidden_sha256_digest_and_allow_revocation(): void
    {
        $token = 'sensorhub_'.bin2hex(random_bytes(32));
        $credential = DeviceCredential::factory()->revoked()->make();
        $credential->setPlaintextToken($token);
        $credential->save();

        $storedHash = DB::table('device_credentials')->where('id', $credential->id)->value('token_hash');

        $this->assertSame(hash('sha256', $token), $storedHash);
        $this->assertNotSame($token, $storedHash);
        $this->assertSame($credential->id, DeviceCredential::where('token_hash', DeviceCredential::hashToken($token))->firstOrFail()->id);
        $this->assertArrayNotHasKey('token_hash', $credential->toArray());
        $this->assertStringNotContainsString($storedHash, $credential->toJson());
        $this->assertNotNull($credential->fresh()->revoked_at);
    }

    public function test_plaintext_credential_cannot_be_saved_through_eloquent(): void
    {
        $credential = DeviceCredential::factory()->make();
        $credential->token_hash = 'sensorhub_plaintext';

        $this->expectException(LogicException::class);
        $credential->save();
    }

    public function test_measurement_value_and_utc_times_are_persisted_independently(): void
    {
        $this->travelTo(now('UTC')->startOfSecond());
        $this->assertSame('+00:00', DB::selectOne('SELECT @@session.time_zone AS timezone')->timezone);
        $sensor = Sensor::factory()->temperature()->create();
        $measuredAt = now('UTC')->subHours(3);
        $measurement = Measurement::factory()->for($sensor)->create([
            'value' => 24.7382,
            'measured_at' => $measuredAt,
        ])->fresh();

        $this->assertSame(24.7382, $measurement->value);
        $this->assertSame('°C', $measurement->unit);
        $this->assertTrue($measurement->measured_at->equalTo($measuredAt));
        $this->assertTrue($measurement->created_at->greaterThan($measurement->measured_at));
        $this->assertSame('+00:00', $measurement->measured_at->format('P'));
        $this->assertSame('+00:00', $measurement->created_at->format('P'));
        $this->assertNull($measurement->updated_at);
    }

    public function test_measurements_can_be_queried_in_time_order_within_a_range(): void
    {
        $sensor = Sensor::factory()->create();
        $start = now('UTC')->subHours(3)->startOfSecond();

        foreach ([2, 0, 1] as $hoursFromStart) {
            Measurement::factory()->for($sensor)->create([
                'measured_at' => $start->copy()->addHours($hoursFromStart),
            ]);
        }

        $times = $sensor->measurements()
            ->whereBetween('measured_at', [$start, $start->copy()->addHour()])
            ->orderBy('measured_at')
            ->get()
            ->pluck('measured_at');

        $this->assertCount(2, $times);
        $this->assertTrue($times[0]->lessThan($times[1]));
    }

    public function test_measurements_remain_append_only_via_eloquent(): void
    {
        $measurement = Measurement::factory()->create();
        $measurement->value = 42;

        $this->expectException(LogicException::class);
        $measurement->save();
    }
}
