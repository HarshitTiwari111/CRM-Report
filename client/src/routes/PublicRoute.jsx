import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PublicRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const redirectTo = user?.role === 'superadmin' ? '/admin/dashboard' : '/employee/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
