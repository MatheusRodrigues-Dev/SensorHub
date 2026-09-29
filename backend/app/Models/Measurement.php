<?php

namespace App\Models;

use Database\Factories\MeasurementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

#[Fillable(['sensor_id', 'value', 'unit', 'measured_at'])]
class Measurement extends Model
{
    /** @use HasFactory<MeasurementFactory> */
    use HasFactory, HasUlids;

    public const UPDATED_AT = null;

    public function sensor(): BelongsTo
    {
        return $this->belongsTo(Sensor::class);
    }

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'measured_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new LogicException('Measurements are append-only.');
        });

        static::deleting(function (): void {
            throw new LogicException('Measurements are append-only.');
        });
    }
}
