import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function ProductivityChart({ data, isLoading, range, onRangeChange }) {
  return (
    <Card
      title="Productivity Trend"
      actions={
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={2} name="Completed" />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
