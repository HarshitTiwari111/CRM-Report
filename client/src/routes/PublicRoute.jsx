import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../utils/constants';

export default function PublicRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  return <Outlet />;
}
