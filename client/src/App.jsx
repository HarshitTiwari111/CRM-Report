import { lazy, Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from './components/ui/Spinner';
import { refreshSession } from './api/axios';
import { setCredentials, logout as logoutAction } from './features/auth/authSlice';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import { useAuth } from './hooks/useAuth';
import { roleHome } from './utils/constants';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage'));
const EmployeePerformancePage = lazy(() => import('./pages/admin/EmployeePerformancePage'));
const DepartmentsPage = lazy(() => import('./pages/admin/DepartmentsPage'));
const ActivityLogsPage = lazy(() => import('./pages/admin/ActivityLogsPage'));
const TaskMonitorPage = lazy(() => import('./pages/admin/TaskMonitorPage'));

const EmployeeDashboardPage = lazy(() => import('./pages/employee/EmployeeDashboardPage'));
const AssignedTasksPage = lazy(() => import('./pages/employee/AssignedTasksPage'));

const TasksPage = lazy(() => import('./pages/shared/TasksPage'));
const DailyUpdatesPage = lazy(() => import('./pages/shared/DailyUpdatesPage'));
const ReportsPage = lazy(() => import('./pages/shared/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function SuspenseFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function RoleHomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user?.role)} replace />;
}

export default function App() {
  const theme = useSelector((state) => state.ui.theme);
  const isBootstrapping = useSelector((state) => state.auth.isBootstrapping);
  const dispatch = useDispatch();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Silent session restore: the refresh token lives in an HttpOnly cookie,
  // so after a reload we exchange it for a fresh in-memory access token.
  useEffect(() => {
    if (!isBootstrapping) return;
    let cancelled = false;
    refreshSession()
      .then((accessToken) => {
        if (!cancelled) dispatch(setCredentials({ accessToken }));
      })
      .catch(() => {
        if (!cancelled) dispatch(logoutAction());
      });
    return () => {
      cancelled = true;
    };
  }, [isBootstrapping, dispatch]);

  if (isBootstrapping) {
    return <SuspenseFallback />;
  }

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>

        {/* Authenticated shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />

            {/* Admin-level (superadmin + admin) */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/employees" element={<EmployeesPage />} />
              <Route path="/admin/employees/:id/performance" element={<EmployeePerformancePage />} />
              <Route path="/admin/tasks" element={<TasksPage />} />
              <Route path="/admin/task-monitor" element={<TaskMonitorPage />} />
              <Route path="/admin/daily-updates" element={<DailyUpdatesPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />
            </Route>

            {/* Employee + manager */}
            <Route element={<ProtectedRoute allowedRoles={['employee', 'manager']} />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee/tasks" element={<TasksPage />} />
              <Route path="/employee/assigned-tasks" element={<AssignedTasksPage />} />
              <Route path="/employee/daily-updates" element={<DailyUpdatesPage />} />
              <Route path="/employee/reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
