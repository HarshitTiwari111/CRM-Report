import { cn } from '../../utils/cn';

const colorMap = {
  indigo: 'bg-primary-50 text-primary-600',
  green: 'bg-emerald-50 text-emerald-600',
  yellow: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-600',
  purple: 'bg-purple-50 text-purple-600',
  slate: 'bg-slate-100 text-slate-600',
  orange: 'bg-orange-50 text-orange-600',
};

export default function StatCard({ label, value, icon: Icon, color = 'indigo', className }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 card-shadow', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorMap[color])}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-800">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
