import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { logout as logoutAction } from '../../features/auth/authSlice';
import { logoutApi } from '../../api/auth';
import { store } from '../../app/store';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
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
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            {initials}
          </div>
        )}
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-slate-700">{user.name}</p>
          <p className="text-xs capitalize leading-tight text-slate-400">{user.role}</p>
        </div>
        <FiChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <FiUser className="h-4 w-4" /> Profile
          </Link>
          {isSuperAdmin && (
            <Link
              to="/admin/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <FiSettings className="h-4 w-4" /> Settings
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <FiLogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
