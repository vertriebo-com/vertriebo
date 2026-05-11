/**
 * Platform-Level Access Helpers
 * Manages global Vertriebo platform roles separate from Organization roles.
 * 
 * Platform Roles:
 * - admin: Base44 super admin (backend@slidebnb.de) - full access to everything
 * - platform_owner: Vertriebo platform owner (admin@vertriebo.com) - full platform access
 * - platform_admin: Platform admin - full platform access except billing/users
 * - support_agent: Support team - read-only org data, can create support notes
 * - readonly_support: Limited read-only support
 * - user: Regular user (must be part of an organization)
 */

/**
 * Check if user is the Base44 super admin
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean}
 */
export function isBase44SuperAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Check if user is a platform owner
 * Includes admin for backward compatibility
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean}
 */
export function isPlatformOwner(user) {
  return user?.role === 'platform_owner' || user?.role === 'admin';
}

/**
 * Check if user is a platform admin (can manage most platform features)
 * Includes admin and platform_owner
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean}
 */
export function isPlatformAdmin(user) {
  return ['admin', 'platform_owner', 'platform_admin'].includes(user?.role);
}

/**
 * Check if user is a support agent (can view org data, create support notes)
 * Includes all admin roles
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean}
 */
export function isSupportAgent(user) {
  return ['admin', 'platform_owner', 'platform_admin', 'support_agent'].includes(user?.role);
}

/**
 * Check if user has readonly support access (can view org data only)
 * Includes all higher roles
 * @param {Object} user - User object from base44.auth.me()
 * @returns {boolean}
 */
export function isReadOnlySupport(user) {
  return [
    'admin',
    'platform_owner',
    'platform_admin',
    'support_agent',
    'readonly_support'
  ].includes(user?.role);
}

/**
 * Get human-readable role label
 * @param {string} role - Role string
 * @returns {string}
 */
export function getRoleLabel(role) {
  const labels = {
    admin: 'Base44 Super Admin',
    platform_owner: 'Platform Owner',
    platform_admin: 'Platform Admin',
    support_agent: 'Support Agent',
    readonly_support: 'Read-Only Support',
    user: 'User'
  };
  return labels[role] || role;
}

/**
 * Check if a user role can access platform admin area
 * @param {string} role - User role
 * @returns {boolean}
 */
export function canAccessPlatformAdmin(role) {
  return ['admin', 'platform_owner', 'platform_admin'].includes(role);
}

/**
 * Check if a user role can access support dashboard
 * @param {string} role - User role
 * @returns {boolean}
 */
export function canAccessSupportDashboard(role) {
  return isSupportAgent({ role });
}

/**
 * Verify that organization role does not grant platform access
 * This is a safety check to prevent organization_admin from accessing platform features
 * @param {string} organizationRole - Role from OrganizationMember
 * @returns {boolean}
 */
export function isOrganizationRoleOnly(organizationRole) {
  return ['organization_admin', 'sales_rep'].includes(organizationRole);
}