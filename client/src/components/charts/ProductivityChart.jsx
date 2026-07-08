import { useSelector } from 'react-redux';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function ProductivityChart({ data, isLoading, range, onRangeChange }) {
  const theme = useSelector((state) => state.ui.theme);
  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#64748b';

  return (
    <Card
      title="Productivity Trend"
      actions={
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickFill }} />
            <YAxis tick={{ fontSize: 12, fill: tickFill }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                borderColor: gridStroke,
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#e2e8f0' : '#1e293b',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: tickFill }} />
            <Line type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={2} name="Completed" />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
