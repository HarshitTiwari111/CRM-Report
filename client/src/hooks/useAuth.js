import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, accessToken, isAuthenticated } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'superadmin';
  const isEmployee = user?.role === 'employee';
  return { user, accessToken, isAuthenticated, isSuperAdmin, isEmployee };
}
