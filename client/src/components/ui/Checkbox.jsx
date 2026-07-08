import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Checkbox = forwardRef(function Checkbox({ label, className, id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <label htmlFor={inputId} className={cn('inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300', className)}>
      <input
        id={inputId}
        ref={ref}
        type="checkbox"
        className="rounded border-slate-300 text-primary-600 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-800"
        {...props}
      />
      {label}
    </label>
  );
});

export default Checkbox;
