import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Measurement } from '../../types/domain'

export function MeasurementChart({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) return <p className="py-12 text-center text-slate-400">No measurements to chart on this page.</p>
  const points = measurements.map(item => ({ ...item, timestamp: new Date(item.measured_at).getTime() }))
  return <div role="img" aria-label={`Line chart of ${measurements.length} ${measurements.length === 1 ? 'measurement' : 'measurements'} on the current page`} className="h-72 w-full" data-testid="measurement-chart">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 10, right: 15, left: 4, bottom: 10 }}>
        <CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={value => new Date(Number(value)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={50} />
        <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString()} formatter={(value, _name, item) => `${value} ${(item.payload as { unit: string | null }).unit ?? ''}`.trim()} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }} />
        <Line type="linear" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={{ r: measurements.length === 1 ? 5 : 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
}
