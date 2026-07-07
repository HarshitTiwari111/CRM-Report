import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  { label, error, className, containerClassName, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
          'focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400',
          'disabled:bg-slate-100 disabled:cursor-not-allowed',
          error ? 'border-red-400' : 'border-slate-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
