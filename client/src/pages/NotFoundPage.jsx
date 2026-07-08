import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-900">
      <FiAlertCircle className="h-14 w-14 text-primary-400 dark:text-primary-500" />
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Page not found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
