import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { logout as logoutAction } from '../../features/auth/authSlice';
import { openSettingsModal } from '../../features/uiSlice';
import { logoutApi } from '../../api/auth';
import { store } from '../../app/store';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef(null);
  const { user, isSuperAdmin } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const refreshToken = store.getState().auth.refreshToken;
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore network errors on logout
    } finally {
      dispatch(logoutAction());
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    }
  };

  if (!user) return null;

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {initials}
          </div>
        )}
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">{user.name}</p>
          <p className="text-xs capitalize leading-tight text-slate-400 dark:text-slate-500">{user.role}</p>
        </div>
        <FiChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <FiUser className="h-4 w-4" /> Profile
          </Link>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setOpen(false);
                dispatch(openSettingsModal());
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FiSettings className="h-4 w-4" /> Settings
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <FiLogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        isLoading={loggingOut}
      />
    </div>
  );
}
