import { lazy, Suspense, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from './components/ui/Spinner';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import { useAuth } from './hooks/useAuth';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
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
  const { isAuthenticated, isSuperAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isSuperAdmin ? '/admin/dashboard' : '/employee/dashboard'} replace />;
}

export default function App() {
  const theme = useSelector((state) => state.ui.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>

        {/* Authenticated shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />

            {/* Superadmin only */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/employees" element={<EmployeesPage />} />
              <Route path="/admin/employees/:id/performance" element={<EmployeePerformancePage />} />
              <Route path="/admin/tasks" element={<TasksPage />} />
              <Route path="/admin/task-monitor" element={<TaskMonitorPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />
            </Route>

            {/* Employee only */}
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee/tasks" element={<TasksPage />} />
              <Route path="/employee/assigned-tasks" element={<AssignedTasksPage />} />
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
