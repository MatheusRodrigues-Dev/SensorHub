<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\DeviceCredentialController;
use App\Http\Controllers\Api\V1\SensorController;
use App\Http\Controllers\Api\V1\TelemetryController;
use App\Http\Middleware\AuthenticateDevice;
use App\Http\Middleware\RequireStatefulSpaSession;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::prefix('auth')->middleware(RequireStatefulSpaSession::class)->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:web')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
    });
});

Route::middleware(['auth:web', RequireStatefulSpaSession::class])->group(function (): void {
    Route::get('devices', [DeviceController::class, 'index']);
    Route::post('devices', [DeviceController::class, 'store']);
    Route::get('devices/{device}', [DeviceController::class, 'show']);
    Route::patch('devices/{device}', [DeviceController::class, 'update']);
    Route::delete('devices/{device}', [DeviceController::class, 'destroy']);

    Route::scopeBindings()->group(function (): void {
        Route::get('devices/{device}/sensors', [SensorController::class, 'index']);
        Route::post('devices/{device}/sensors', [SensorController::class, 'store']);
        Route::get('devices/{device}/sensors/{sensor}', [SensorController::class, 'show']);
        Route::patch('devices/{device}/sensors/{sensor}', [SensorController::class, 'update']);
        Route::delete('devices/{device}/sensors/{sensor}', [SensorController::class, 'destroy']);
        Route::post('devices/{device}/credentials', [DeviceCredentialController::class, 'store']);
        Route::post('devices/{device}/credentials/{credential}/rotate', [DeviceCredentialController::class, 'rotate']);
        Route::delete('devices/{device}/credentials/{credential}', [DeviceCredentialController::class, 'destroy']);
    });
});

Route::post('devices/{device}/telemetry', [TelemetryController::class, 'store'])
    ->middleware(AuthenticateDevice::class);
