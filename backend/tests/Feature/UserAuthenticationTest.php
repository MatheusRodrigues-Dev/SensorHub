<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_without_storing_plaintext_password(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/register', [
            'name' => 'Ada Example',
            'email' => 'ada@example.test',
            'password' => 'correct-password',
            'password_confirmation' => 'correct-password',
        ]);

        $user = User::where('email', 'ada@example.test')->firstOrFail();
        $response->assertCreated()->assertExactJson([
            'data' => ['id' => $user->id, 'name' => 'Ada Example', 'email' => 'ada@example.test'],
        ]);

        $this->assertNotSame('correct-password', $user->password);
        $this->assertTrue(Hash::check('correct-password', $user->password));
        $this->assertGuest('web');
    }

    public function test_registration_validates_required_fields_and_duplicate_email(): void
    {
        User::factory()->create(['email' => 'used@example.test']);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/register', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Duplicate',
            'email' => 'used@example.test',
            'password' => 'correct-password',
            'password_confirmation' => 'correct-password',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_valid_login_regenerates_session_and_returns_current_user(): void
    {
        $user = User::factory()->create([
            'email' => 'ada@example.test',
            'password' => 'correct-password',
        ]);
        $this->withSession(['started' => true]);
        $oldSessionId = session()->getId();

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/login', [
            'email' => 'ada@example.test',
            'password' => 'correct-password',
        ])->assertNoContent();

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNotSame($oldSessionId, session()->getId());
        $this->getJson('/api/v1/auth/user')
            ->assertOk()
            ->assertExactJson(['data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]]);
    }

    public function test_invalid_login_returns_json_401_without_authenticating(): void
    {
        User::factory()->create(['email' => 'ada@example.test', 'password' => 'correct-password']);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/login', [
            'email' => 'ada@example.test',
            'password' => 'wrong-password',
        ])->assertUnauthorized()->assertExactJson(['message' => 'Invalid credentials.']);

        $this->assertGuest('web');
    }

    public function test_login_validation_returns_json_422(): void
    {
        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_logout_invalidates_authentication_and_rotates_csrf_token(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withSession(['started' => true]);
        $oldToken = session()->token();

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');
        $this->assertNotSame($oldToken, session()->token());
        $this->getJson('/api/v1/auth/user')->assertUnauthorized();
    }

    public function test_protected_auth_routes_require_session_and_reject_device_bearer_token(): void
    {
        $this->withHeader('Origin', 'http://localhost')->getJson('/api/v1/auth/user')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);

        $this->postJson('/api/v1/auth/logout')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);

        $this->withToken('sensorhub_not-a-user-session')->getJson('/api/v1/auth/user')
            ->assertUnauthorized();
    }

    public function test_stateful_post_requires_csrf_token_when_test_bypass_is_disabled(): void
    {
        $this->app->instance('env', 'local');
        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/login', [])
            ->assertStatus(419);

        $this->get('/sanctum/csrf-cookie')->assertNoContent();
        $this->withHeader('X-CSRF-TOKEN', session()->token())
            ->postJson('/api/v1/auth/login', [])
            ->assertStatus(422);
    }

    public function test_authentication_requests_without_a_first_party_origin_are_rejected(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'someone@example.test',
            'password' => 'StrongPass123!',
        ])->assertStatus(419)->assertJsonStructure(['message']);
    }

    public function test_login_is_rate_limited_by_email(): void
    {
        $this->withHeader('Origin', 'http://localhost');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'rate-limited@example.test',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'rate-limited@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(429)->assertJsonStructure(['message']);
    }

    public function test_login_is_rate_limited_across_emails_from_one_ip(): void
    {
        $this->withHeader('Origin', 'http://localhost');

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => "attempt-{$attempt}@example.test",
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'attempt-11@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }
}
