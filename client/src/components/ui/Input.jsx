import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  { label, error, className, containerClassName, id, icon: Icon, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
            'focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400',
            'disabled:bg-slate-100 disabled:cursor-not-allowed',
            'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-primary-900/40 dark:disabled:bg-slate-700',
            error ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600',
            Icon && 'pl-9',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Input;
