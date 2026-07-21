import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

// NOTE: API_CONTRACT.md has no dedicated global-search endpoint. This routes
// the query to the Tasks list (admin) with its existing ?search= param, which
// is the closest supported search surface. See README deviations.
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { isAdminLevel } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const base = isAdminLevel ? '/admin/tasks' : '/employee/tasks';
    navigate(`${base}?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative hidden max-w-xs flex-1 md:block">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search tasks..."
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-primary-900/40"
      />
    </form>
  );
}
