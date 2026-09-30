import { makeReadings, parseConfig, sendBatch } from './simulator.js'

async function main(): Promise<void> {
  const mode = process.argv[2] || '--once'
  if (mode !== '--once' && mode !== '--continuous') throw new Error('Use --once or --continuous.')
  const config = parseConfig(process.env)
  let sequence = 0
  let stopped = false
  process.once('SIGINT', () => { stopped = true })
  process.once('SIGTERM', () => { stopped = true })
  do {
    const readings = makeReadings(config, sequence++)
    const accepted = await sendBatch(config, readings)
    process.stdout.write(`Synthetic telemetry: device ${config.deviceId}, accepted ${accepted}, ${readings[0].measured_at}\n`)
    if (mode === '--once' || stopped) break
    await new Promise(resolve => setTimeout(resolve, config.intervalSeconds * 1000))
  } while (!stopped)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Simulator failed.'}\n`)
  process.exitCode = 1
})
