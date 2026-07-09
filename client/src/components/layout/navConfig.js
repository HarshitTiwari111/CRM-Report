import {
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiClipboard,
  FiEdit3,
  FiBarChart2,
  FiUser,
  FiBriefcase,
  FiActivity,
} from 'react-icons/fi';

export const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/employees', label: 'Employees', icon: FiUsers },
  { to: '/admin/tasks', label: 'Tasks', icon: FiCheckSquare },
  { to: '/admin/task-monitor', label: 'Task Monitor', icon: FiClipboard },
  { to: '/admin/daily-updates', label: 'Daily Updates', icon: FiEdit3 },
  { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/admin/departments', label: 'Departments', icon: FiBriefcase },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: FiActivity },
  { to: '/profile', label: 'Profile', icon: FiUser },
];

export const employeeNav = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/employee/tasks', label: 'Tasks', icon: FiCheckSquare },
  { to: '/employee/assigned-tasks', label: 'My Assigned Tasks', icon: FiClipboard },
  { to: '/employee/daily-updates', label: 'Daily Updates', icon: FiEdit3 },
  { to: '/employee/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/profile', label: 'Profile', icon: FiUser },
];
