import {
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiBarChart2,
  FiUser,
  FiBriefcase,
  FiActivity,
} from 'react-icons/fi';

export const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/employees', label: 'Employees', icon: FiUsers },
  { to: '/admin/tasks', label: 'Tasks', icon: FiCheckSquare },
  { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/admin/departments', label: 'Departments', icon: FiBriefcase },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: FiActivity },
  { to: '/profile', label: 'Profile', icon: FiUser },
];

export const employeeNav = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/employee/tasks', label: 'My Tasks', icon: FiCheckSquare },
  { to: '/employee/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/profile', label: 'Profile', icon: FiUser },
];
