import { lazy, Suspense } from 'react';
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
const TeamsPage = lazy(() => import('./pages/admin/TeamsPage'));
const ProjectsPage = lazy(() => import('./pages/admin/ProjectsPage'));
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'));
const TaskCategoriesPage = lazy(() => import('./pages/admin/TaskCategoriesPage'));
const HolidaysPage = lazy(() => import('./pages/admin/HolidaysPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ActivityLogsPage = lazy(() => import('./pages/admin/ActivityLogsPage'));
const AdminAttendancePage = lazy(() => import('./pages/admin/AttendancePage'));

const EmployeeDashboardPage = lazy(() => import('./pages/employee/EmployeeDashboardPage'));
const EmployeeAttendancePage = lazy(() => import('./pages/employee/AttendancePage'));

const TasksPage = lazy(() => import('./pages/shared/TasksPage'));
const ReportsPage = lazy(() => import('./pages/shared/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));
const CalendarPage = lazy(() => import('./pages/shared/CalendarPage'));

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
            <Route path="/calendar" element={<CalendarPage />} />

            {/* Superadmin only */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/employees" element={<EmployeesPage />} />
              <Route path="/admin/employees/:id/performance" element={<EmployeePerformancePage />} />
              <Route path="/admin/tasks" element={<TasksPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/teams" element={<TeamsPage />} />
              <Route path="/admin/projects" element={<ProjectsPage />} />
              <Route path="/admin/clients" element={<ClientsPage />} />
              <Route path="/admin/task-categories" element={<TaskCategoriesPage />} />
              <Route path="/admin/holidays" element={<HolidaysPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />
              <Route path="/admin/attendance" element={<AdminAttendancePage />} />
            </Route>

            {/* Employee only */}
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee/tasks" element={<TasksPage />} />
              <Route path="/employee/reports" element={<ReportsPage />} />
              <Route path="/employee/attendance" element={<EmployeeAttendancePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
