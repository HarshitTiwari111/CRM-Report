import {
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiBarChart2,
  FiCalendar,
  FiSettings,
  FiUser,
  FiBriefcase,
  FiLayers,
  FiFolder,
  FiUserCheck,
  FiTag,
  FiSun,
  FiActivity,
  FiClock,
} from 'react-icons/fi';

export const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/admin/employees', label: 'Employees', icon: FiUsers },
  { to: '/admin/tasks', label: 'Tasks', icon: FiCheckSquare },
  { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/calendar', label: 'Calendar', icon: FiCalendar },
  { to: '/admin/attendance', label: 'Attendance', icon: FiClock },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: FiActivity },
  {
    label: 'Organization',
    icon: FiLayers,
    children: [
      { to: '/admin/departments', label: 'Departments', icon: FiBriefcase },
      { to: '/admin/teams', label: 'Teams', icon: FiUserCheck },
      { to: '/admin/projects', label: 'Projects', icon: FiFolder },
      { to: '/admin/clients', label: 'Clients', icon: FiUsers },
      { to: '/admin/task-categories', label: 'Task Categories', icon: FiTag },
      { to: '/admin/holidays', label: 'Holidays', icon: FiSun },
    ],
  },
  { to: '/admin/settings', label: 'Settings', icon: FiSettings },
  { to: '/profile', label: 'Profile', icon: FiUser },
];

export const employeeNav = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/employee/tasks', label: 'My Tasks', icon: FiCheckSquare },
  { to: '/employee/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/calendar', label: 'Calendar', icon: FiCalendar },
  { to: '/employee/attendance', label: 'Attendance', icon: FiClock },
  { to: '/profile', label: 'Profile', icon: FiUser },
];
