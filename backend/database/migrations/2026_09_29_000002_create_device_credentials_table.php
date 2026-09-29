<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_credentials', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('device_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->char('token_hash', 64)->unique();
            $table->timestamp('last_used_at', 6)->nullable();
            $table->timestamp('expires_at', 6)->nullable()->index();
            $table->timestamp('revoked_at', 6)->nullable();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['device_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_credentials');
    }
};
