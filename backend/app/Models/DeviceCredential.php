<?php

namespace App\Models;

use Database\Factories\DeviceCredentialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

#[Fillable(['device_id', 'name', 'last_used_at', 'expires_at', 'revoked_at'])]
#[Hidden(['token_hash'])]
class DeviceCredential extends Model
{
    /** @use HasFactory<DeviceCredentialFactory> */
    use HasFactory, HasUlids;

    public const UPDATED_AT = null;

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function setPlaintextToken(string $token): void
    {
        $this->token_hash = self::hashToken($token);
    }

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $credential): void {
            if (! is_string($credential->token_hash)
                || preg_match('/\A[a-f0-9]{64}\z/', $credential->token_hash) !== 1) {
                throw new LogicException('A device credential requires a SHA-256 token digest.');
            }
        });
    }
}
