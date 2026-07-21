// Central role definitions. Higher level = more privilege.
const ROLE_LEVELS = {
  employee: 1,
  manager: 2,
  admin: 3,
  superadmin: 4,
};

const ALL_ROLES = Object.keys(ROLE_LEVELS);

const roleLevel = (role) => ROLE_LEVELS[role] || 0;

// Admin-level roles get org-wide visibility (dashboards, all users' data).
const isAdminLevel = (role) => roleLevel(role) >= ROLE_LEVELS.admin;

// Whether an actor may create/modify/delete a user holding targetRole.
// Superadmin manages everyone (including other superadmins); everyone else
// may only manage roles strictly below their own.
const canManageRole = (actorRole, targetRole) =>
  actorRole === 'superadmin' || roleLevel(actorRole) > roleLevel(targetRole);

module.exports = { ROLE_LEVELS, ALL_ROLES, roleLevel, isAdminLevel, canManageRole };
