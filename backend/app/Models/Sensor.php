<?php

namespace App\Models;

use Database\Factories\SensorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use LogicException;

#[Fillable(['device_id', 'key', 'name', 'type', 'unit'])]
class Sensor extends Model
{
    /** @use HasFactory<SensorFactory> */
    use HasFactory, HasUlids, SoftDeletes;

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function measurements(): HasMany
    {
        return $this->hasMany(Measurement::class);
    }

    protected static function booted(): void
    {
        static::updating(function (self $sensor): void {
            if ($sensor->isDirty('key')) {
                throw new LogicException('A sensor key cannot be changed.');
            }
        });
    }
}
