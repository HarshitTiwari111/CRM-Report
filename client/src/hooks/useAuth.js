import { useSelector } from 'react-redux';
import { isAdminRole } from '../utils/constants';

export function useAuth() {
  const { user, accessToken, isAuthenticated } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdminLevel = isAdminRole(user?.role);
  const isEmployee = !isAdminLevel;
  return { user, accessToken, isAuthenticated, isSuperAdmin, isAdminLevel, isEmployee };
}
