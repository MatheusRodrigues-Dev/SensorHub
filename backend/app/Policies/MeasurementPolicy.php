<?php

namespace App\Policies;

use App\Models\Measurement;
use App\Models\Sensor;
use App\Models\User;

class MeasurementPolicy
{
    public function viewAny(User $user, Sensor $sensor): bool
    {
        return $sensor->device->user_id === $user->id;
    }

    public function view(User $user, Measurement $measurement): bool
    {
        return $this->viewAny($user, $measurement->sensor);
    }
}
