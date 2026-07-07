import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function TopPerformersChart({ data, isLoading }) {
  return (
    <Card title="Top Performers">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data || []}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
            <Bar dataKey="tasksCompleted" fill="#22c55e" radius={[0, 4, 4, 0]} name="Tasks Completed" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
