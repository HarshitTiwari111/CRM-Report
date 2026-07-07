import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function DepartmentPerformanceChart({ data, isLoading }) {
  return (
    <Card title="Department Performance">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
            <Bar dataKey="completionRate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completion %" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
