import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function CompletionTrendChart({ data, isLoading }) {
  return (
    <Card title="Task Completion Trend">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
            <Area type="monotone" dataKey="rate" stroke="#4f46e5" fill="url(#colorCompletion)" strokeWidth={2} name="Completion Rate" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
