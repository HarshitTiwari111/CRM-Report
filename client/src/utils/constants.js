export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

// Roles that get the admin UI and org-wide data access
export const ADMIN_LEVEL_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN];

export const isAdminRole = (role) => ADMIN_LEVEL_ROLES.includes(role);

export const roleHome = (role) => (isAdminRole(role) ? '/admin/dashboard' : '/employee/dashboard');

export const TASK_STATUS = ['pending', 'in-progress', 'completed', 'hold', 'cancelled'];

export const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];

export const TASK_TYPE = [
  'development',
  'bugfix',
  'meeting',
  'testing',
  'research',
  'design',
  'support',
  'deployment',
  'documentation',
  'training',
  'other',
];

export const TASK_STATUS_OPTIONS = TASK_STATUS.map((s) => ({
  value: s,
  label: s.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase()),
}));

export const TASK_PRIORITY_OPTIONS = TASK_PRIORITY.map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

export const TASK_TYPE_OPTIONS = TASK_TYPE.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export const DATE_RANGE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export const REPORT_TYPE_OPTIONS = [
  { value: 'employee', label: 'By Employee' },
  { value: 'department', label: 'By Department' },
  { value: 'project', label: 'By Project' },
  { value: 'status', label: 'By Status' },
  { value: 'manager', label: 'By Manager' },
];
