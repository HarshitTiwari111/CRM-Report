import { useSelector } from 'react-redux';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import { cn } from '../../utils/cn';

function formatTick(value) {
  try {
    return format(parseISO(value), 'MMM d');
  } catch {
    return value;
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">{formatTick(label)}</p>
      <p className="text-primary-700 dark:text-primary-400">
        Completion rate: <span className="font-semibold">{payload[0].value}%</span>
      </p>
      <p className="text-slate-400 dark:text-slate-500">
        {payload[0].payload.completed} of {payload[0].payload.totalTasks} tasks
      </p>
    </div>
  );
}

export default function CompletionTrendChart({ data, isLoading }) {
  const theme = useSelector((state) => state.ui.theme);
  const gridStroke = theme === 'dark' ? '#334155' : '#e2e8f0';
  const tickFill = theme === 'dark' ? '#94a3b8' : '#64748b';
  const trend = data || [];
  const avgRate = trend.length
    ? Math.round((trend.reduce((sum, d) => sum + (d.completionRate || 0), 0) / trend.length) * 10) / 10
    : 0;

  const midpoint = Math.floor(trend.length / 2);
  const firstHalfAvg = midpoint
    ? trend.slice(0, midpoint).reduce((s, d) => s + (d.completionRate || 0), 0) / midpoint
    : 0;
  const secondHalfAvg = trend.length - midpoint
    ? trend.slice(midpoint).reduce((s, d) => s + (d.completionRate || 0), 0) / (trend.length - midpoint)
    : 0;
  const delta = Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10;
  const TrendIcon = delta > 0 ? FiTrendingUp : delta < 0 ? FiTrendingDown : FiMinus;

  return (
    <Card
      title="Task Completion Trend"
      actions={
        !isLoading &&
        trend.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 dark:text-slate-500">
              Avg <span className="font-semibold text-slate-700 dark:text-slate-300">{avgRate}%</span>
            </span>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                delta > 0 && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                delta < 0 && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                delta === 0 && 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {delta > 0 ? '+' : ''}
              {delta}%
            </span>
          </div>
        )
      }
    >
      <p className="-mt-2 mb-4 text-xs text-slate-400 dark:text-slate-500">Daily completion rate over the last 30 days</p>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : trend.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <FiTrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No task activity in the last 30 days</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatTick} tick={{ fontSize: 12, fill: tickFill }} />
            <YAxis
              tick={{ fontSize: 12, fill: tickFill }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="completionRate"
              stroke="#4f46e5"
              fill="url(#colorCompletion)"
              strokeWidth={2}
              name="Completion Rate"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
