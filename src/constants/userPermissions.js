// User Permission System - Multi-level access control
export const USER_LEVELS = {
  ADMIN: 'admin',
  SUPER_USER: 'super_user', 
  STANDARD: 'standard'
};

export const USER_PERMISSIONS = {
  // System-level permissions
  SYSTEM: {
    MANAGE_ALL_USERS: 'system.manage_all_users',
    MANAGE_ALL_COMPANIES: 'system.manage_all_companies',
    MANAGE_ALL_PROJECTS: 'system.manage_all_projects',
    VIEW_SYSTEM_ANALYTICS: 'system.view_analytics',
    MANAGE_SYSTEM_SETTINGS: 'system.manage_settings'
  },
  
  // Company-level permissions
  COMPANY: {
    MANAGE_COMPANY_USERS: 'company.manage_users',
    MANAGE_COMPANY_PROJECTS: 'company.manage_projects',
    VIEW_COMPANY_ANALYTICS: 'company.view_analytics',
    MANAGE_COMPANY_SETTINGS: 'company.manage_settings',
    INVITE_USERS: 'company.invite_users'
  },
  
  // Project-level permissions
  PROJECT: {
    MANAGE_PROJECT_USERS: 'project.manage_users',
    VIEW_PROJECT_DETAILS: 'project.view_details',
    MANAGE_PROJECT_DATA: 'project.manage_data',
    VIEW_PROJECT_ANALYTICS: 'project.view_analytics'
  }
};

// Permission definitions for each user level
export const USER_LEVEL_PERMISSIONS = {
  [USER_LEVELS.ADMIN]: {
    level: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      // All system permissions
      USER_PERMISSIONS.SYSTEM.MANAGE_ALL_USERS,
      USER_PERMISSIONS.SYSTEM.MANAGE_ALL_COMPANIES,
      USER_PERMISSIONS.SYSTEM.MANAGE_ALL_PROJECTS,
      USER_PERMISSIONS.SYSTEM.VIEW_SYSTEM_ANALYTICS,
      USER_PERMISSIONS.SYSTEM.MANAGE_SYSTEM_SETTINGS,
      
      // All company permissions
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_USERS,
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_PROJECTS,
      USER_PERMISSIONS.COMPANY.VIEW_COMPANY_ANALYTICS,
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_SETTINGS,
      USER_PERMISSIONS.COMPANY.INVITE_USERS,
      
      // All project permissions
      USER_PERMISSIONS.PROJECT.MANAGE_PROJECT_USERS,
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_DETAILS,
      USER_PERMISSIONS.PROJECT.MANAGE_PROJECT_DATA,
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_ANALYTICS
    ],
    canAccessAllCompanies: true,
    canAccessAllProjects: true,
    canManageUsers: true,
    canManageCompanies: true,
    canManageProjects: true
  },
  
  [USER_LEVELS.SUPER_USER]: {
    level: 'super_user',
    name: 'Super User',
    description: 'High-level access with company and project management capabilities',
    permissions: [
      // Company-level permissions
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_USERS,
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_PROJECTS,
      USER_PERMISSIONS.COMPANY.VIEW_COMPANY_ANALYTICS,
      USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_SETTINGS,
      USER_PERMISSIONS.COMPANY.INVITE_USERS,
      
      // Project permissions
      USER_PERMISSIONS.PROJECT.MANAGE_PROJECT_USERS,
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_DETAILS,
      USER_PERMISSIONS.PROJECT.MANAGE_PROJECT_DATA,
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_ANALYTICS
    ],
    canAccessAllCompanies: false, // Can be assigned to multiple companies
    canAccessAllProjects: false,  // Can be assigned to multiple projects
    canManageUsers: true,
    canManageCompanies: true,
    canManageProjects: true
  },
  
  [USER_LEVELS.STANDARD]: {
    level: 'standard',
    name: 'Standard User',
    description: 'Basic access with limited permissions',
    permissions: [
      // Basic project permissions
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_DETAILS,
      USER_PERMISSIONS.PROJECT.VIEW_PROJECT_ANALYTICS
    ],
    canAccessAllCompanies: false,
    canAccessAllProjects: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManageProjects: false
  }
};

// Helper functions
export const getUserLevelInfo = (userLevel) => {
  return USER_LEVEL_PERMISSIONS[userLevel] || USER_LEVEL_PERMISSIONS[USER_LEVELS.STANDARD];
};

export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

export const hasSystemPermission = (user, permission) => {
  return hasPermission(user, permission);
};

export const hasCompanyPermission = (user, permission, companyId) => {
  if (!hasPermission(user, permission)) return false;
  
  // Check if user has access to this company
  if (user.canAccessAllCompanies) return true;
  if (user.assignedCompanyId === companyId) return true;
  if (user.companyAccess && user.companyAccess.includes(companyId)) return true;
  
  return false;
};

export const hasProjectPermission = (user, permission, projectId, companyId) => {
  if (!hasPermission(user, permission)) return false;
  
  // Check if user has access to this project
  if (user.canAccessAllProjects) return true;
  if (user.assignedProjects && user.assignedProjects.includes(projectId)) return true;
  
  // Check company access for the project
  return hasCompanyPermission(user, USER_PERMISSIONS.COMPANY.MANAGE_COMPANY_PROJECTS, companyId);
};

export const canManageUser = (currentUser, targetUser) => {
  // Admins can manage anyone
  if (currentUser.userLevel === USER_LEVELS.ADMIN) return true;
  
  // Super users can manage users in their companies
  if (currentUser.userLevel === USER_LEVELS.SUPER_USER) {
    if (currentUser.canAccessAllCompanies) return true;
    if (targetUser.assignedCompanyId && currentUser.companyAccess.includes(targetUser.assignedCompanyId)) return true;
    return false;
  }
  
  // Standard users cannot manage other users
  return false;
};

export const getAvailableUserLevels = (currentUser) => {
  if (currentUser.userLevel === USER_LEVELS.ADMIN) {
    return [USER_LEVELS.ADMIN, USER_LEVELS.SUPER_USER, USER_LEVELS.STANDARD];
  }
  
  if (currentUser.userLevel === USER_LEVELS.SUPER_USER) {
    return [USER_LEVELS.SUPER_USER, USER_LEVELS.STANDARD];
  }
  
  return [USER_LEVELS.STANDARD];
};
