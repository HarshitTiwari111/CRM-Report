import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const fallback = user?.role === 'superadmin' ? '/admin/dashboard' : '/employee/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
