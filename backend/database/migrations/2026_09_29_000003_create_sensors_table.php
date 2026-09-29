<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensors', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('device_id')->constrained()->restrictOnDelete();
            $table->string('key', 80);
            $table->string('name', 120);
            $table->string('type', 32);
            $table->string('unit', 20)->nullable();
            $table->timestamps(6);
            $table->softDeletes('deleted_at', 6);
            $table->unique(['device_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensors');
    }
};
