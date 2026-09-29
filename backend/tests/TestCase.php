<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        if (($_SERVER['DB_HOST'] ?? null) !== 'mysql-testing'
            || ($_SERVER['DB_DATABASE'] ?? null) !== 'sensorhub_testing') {
            throw new \RuntimeException('Test environment must target the isolated MySQL service before Laravel boots.');
        }

        parent::setUp();

        if (config('database.default') !== 'mysql'
            || config('database.connections.mysql.host') !== 'mysql-testing'
            || config('database.connections.mysql.database') !== 'sensorhub_testing') {
            throw new \RuntimeException(sprintf(
                'Tests must use isolated MySQL (actual: %s at %s/%s).',
                config('database.default'),
                config('database.connections.mysql.host'),
                config('database.connections.mysql.database'),
            ));
        }
    }
}
