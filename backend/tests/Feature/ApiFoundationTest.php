<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    public function test_versioned_health_endpoint_returns_json_without_accept_header(): void
    {
        $this->get('/api/v1/health')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_unknown_api_route_returns_json(): void
    {
        $this->get('/api/v1/missing')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure(['message']);
    }

    public function test_api_method_error_returns_json(): void
    {
        $this->post('/api/v1/health')
            ->assertStatus(405)
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_testing_database_is_isolated(): void
    {
        $this->assertSame('sensorhub_testing', DB::selectOne('SELECT DATABASE() AS name')->name);
    }

    public function test_api_validation_error_uses_laravel_json_shape(): void
    {
        Route::post('/api/v1/test-validation', function () {
            request()->validate(['name' => ['required']]);
        });

        $this->post('/api/v1/test-validation', [])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_api_server_error_hides_details_when_debug_is_disabled(): void
    {
        Route::get('/api/v1/test-exception', function () {
            throw new \RuntimeException('private implementation detail');
        });

        config()->set('app.debug', false);

        $this->get('/api/v1/test-exception')
            ->assertStatus(500)
            ->assertJsonMissing(['message' => 'private implementation detail'])
            ->assertDontSee('trace');
    }
}
