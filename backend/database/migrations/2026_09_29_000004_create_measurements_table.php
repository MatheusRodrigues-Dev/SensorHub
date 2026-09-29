<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('measurements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('sensor_id')->constrained()->restrictOnDelete();
            $table->double('value');
            $table->string('unit', 20)->nullable();
            $table->timestamp('measured_at', 6);
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['sensor_id', 'measured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measurements');
    }
};
