import { cn } from '../../utils/cn';

const colorMap = {
  slate: 'bg-slate-100 text-slate-700',
  indigo: 'bg-primary-100 text-primary-700',
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

// Domain-specific mappers so components don't repeat this logic
export const statusColor = {
  pending: 'slate',
  'in-progress': 'blue',
  completed: 'green',
  hold: 'yellow',
  cancelled: 'red',
};

export const priorityColor = {
  low: 'slate',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

export default function Badge({ children, color = 'slate', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colorMap[color] || colorMap.slate,
        className
      )}
    >
      {children}
    </span>
  );
}
