import { useParams } from 'react-router-dom'
import { MeasurementHistory } from './MeasurementHistory'

export function ArchivedHistoryPage() {
  const { sensorId = '' } = useParams()
  return <main className="mx-auto max-w-6xl space-y-9 px-6 py-10 sm:py-14">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Archived sensor history</p><h1 className="mt-2 text-3xl font-semibold">Historical measurements</h1><p className="mt-3 max-w-2xl text-sm text-slate-400">This sensor is no longer active. Its retained measurements remain readable, using each measurement’s historical unit.</p></div>
    <MeasurementHistory sensorId={sensorId} />
  </main>
}
