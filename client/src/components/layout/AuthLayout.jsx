import { FiCheckSquare } from 'react-icons/fi';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <FiCheckSquare className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">TaskPulse</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 card-shadow dark:border-slate-700 dark:bg-slate-800">
          {title && <h2 className="mb-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>}
          {subtitle && <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
