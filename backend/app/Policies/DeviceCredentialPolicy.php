<?php

namespace App\Policies;

use App\Models\Device;
use App\Models\DeviceCredential;
use App\Models\User;

class DeviceCredentialPolicy
{
    public function viewAny(User $user, Device $device): bool
    {
        return $device->user_id === $user->id;
    }

    public function create(User $user, Device $device): bool
    {
        return $this->viewAny($user, $device);
    }

    public function view(User $user, DeviceCredential $credential): bool
    {
        return $credential->device->user_id === $user->id;
    }

    public function rotate(User $user, DeviceCredential $credential): bool
    {
        return $this->view($user, $credential);
    }

    public function delete(User $user, DeviceCredential $credential): bool
    {
        return $this->view($user, $credential);
    }
}
