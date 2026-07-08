import { useSelector } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function DepartmentPerformanceChart({ data, isLoading }) {
  const theme = useSelector((state) => state.ui.theme);
  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#64748b';

  return (
    <Card title="Department Performance">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickFill }} />
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
            <Bar dataKey="completionRate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completion %" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
