<?php

namespace App\Policies;

use App\Models\Device;
use App\Models\Sensor;
use App\Models\User;

class SensorPolicy
{
    public function viewAny(User $user, Device $device): bool
    {
        return $device->user_id === $user->id;
    }

    public function create(User $user, Device $device): bool
    {
        return $this->viewAny($user, $device);
    }

    public function view(User $user, Sensor $sensor): bool
    {
        return $sensor->device->user_id === $user->id;
    }

    public function update(User $user, Sensor $sensor): bool
    {
        return $this->view($user, $sensor);
    }

    public function delete(User $user, Sensor $sensor): bool
    {
        return $this->view($user, $sensor);
    }
}
