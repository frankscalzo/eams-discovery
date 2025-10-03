// Dynamic Permission System
// Users are tied to companies but permissions are granular and configurable

// Permission Types
export const PERMISSION_TYPES = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Company Management
  MANAGE_COMPANIES: 'manage_companies',
  VIEW_COMPANIES: 'view_companies',
  CREATE_COMPANIES: 'create_companies',
  EDIT_COMPANIES: 'edit_companies',
  DELETE_COMPANIES: 'delete_companies',
  
  // Project Management
  MANAGE_PROJECTS: 'manage_projects',
  VIEW_PROJECTS: 'view_projects',
  CREATE_PROJECTS: 'create_projects',
  EDIT_PROJECTS: 'edit_projects',
  DELETE_PROJECTS: 'delete_projects',
  
  // Application Management
  MANAGE_APPLICATIONS: 'manage_applications',
  VIEW_APPLICATIONS: 'view_applications',
  CREATE_APPLICATIONS: 'create_applications',
  EDIT_APPLICATIONS: 'edit_applications',
  DELETE_APPLICATIONS: 'delete_applications',
  
  // System Administration
  SYSTEM_ADMIN: 'system_admin',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings'
};

// Permission Categories for UI grouping
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: {
    name: 'User Management',
    permissions: [
      PERMISSION_TYPES.MANAGE_USERS,
      PERMISSION_TYPES.VIEW_USERS,
      PERMISSION_TYPES.CREATE_USERS,
      PERMISSION_TYPES.EDIT_USERS,
      PERMISSION_TYPES.DELETE_USERS
    ]
  },
  COMPANY_MANAGEMENT: {
    name: 'Company Management',
    permissions: [
      PERMISSION_TYPES.MANAGE_COMPANIES,
      PERMISSION_TYPES.VIEW_COMPANIES,
      PERMISSION_TYPES.CREATE_COMPANIES,
      PERMISSION_TYPES.EDIT_COMPANIES,
      PERMISSION_TYPES.DELETE_COMPANIES
    ]
  },
  PROJECT_MANAGEMENT: {
    name: 'Project Management',
    permissions: [
      PERMISSION_TYPES.MANAGE_PROJECTS,
      PERMISSION_TYPES.VIEW_PROJECTS,
      PERMISSION_TYPES.CREATE_PROJECTS,
      PERMISSION_TYPES.EDIT_PROJECTS,
      PERMISSION_TYPES.DELETE_PROJECTS
    ]
  },
  APPLICATION_MANAGEMENT: {
    name: 'Application Management',
    permissions: [
      PERMISSION_TYPES.MANAGE_APPLICATIONS,
      PERMISSION_TYPES.VIEW_APPLICATIONS,
      PERMISSION_TYPES.CREATE_APPLICATIONS,
      PERMISSION_TYPES.EDIT_APPLICATIONS,
      PERMISSION_TYPES.DELETE_APPLICATIONS
    ]
  },
  SYSTEM_ADMINISTRATION: {
    name: 'System Administration',
    permissions: [
      PERMISSION_TYPES.SYSTEM_ADMIN,
      PERMISSION_TYPES.VIEW_AUDIT_LOGS,
      PERMISSION_TYPES.MANAGE_SYSTEM_SETTINGS
    ]
  }
};

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSION_TYPES.MANAGE_USERS]: 'Full user management access',
  [PERMISSION_TYPES.VIEW_USERS]: 'View user information',
  [PERMISSION_TYPES.CREATE_USERS]: 'Create new users',
  [PERMISSION_TYPES.EDIT_USERS]: 'Edit existing users',
  [PERMISSION_TYPES.DELETE_USERS]: 'Delete users',
  
  [PERMISSION_TYPES.MANAGE_COMPANIES]: 'Full company management access',
  [PERMISSION_TYPES.VIEW_COMPANIES]: 'View company information',
  [PERMISSION_TYPES.CREATE_COMPANIES]: 'Create new companies',
  [PERMISSION_TYPES.EDIT_COMPANIES]: 'Edit existing companies',
  [PERMISSION_TYPES.DELETE_COMPANIES]: 'Delete companies',
  
  [PERMISSION_TYPES.MANAGE_PROJECTS]: 'Full project management access',
  [PERMISSION_TYPES.VIEW_PROJECTS]: 'View project information',
  [PERMISSION_TYPES.CREATE_PROJECTS]: 'Create new projects',
  [PERMISSION_TYPES.EDIT_PROJECTS]: 'Edit existing projects',
  [PERMISSION_TYPES.DELETE_PROJECTS]: 'Delete projects',
  
  [PERMISSION_TYPES.MANAGE_APPLICATIONS]: 'Full application management access',
  [PERMISSION_TYPES.VIEW_APPLICATIONS]: 'View application information',
  [PERMISSION_TYPES.CREATE_APPLICATIONS]: 'Create new applications',
  [PERMISSION_TYPES.EDIT_APPLICATIONS]: 'Edit existing applications',
  [PERMISSION_TYPES.DELETE_APPLICATIONS]: 'Delete applications',
  
  [PERMISSION_TYPES.SYSTEM_ADMIN]: 'Full system administration access',
  [PERMISSION_TYPES.VIEW_AUDIT_LOGS]: 'View system audit logs',
  [PERMISSION_TYPES.MANAGE_SYSTEM_SETTINGS]: 'Manage system settings'
};

// Helper functions
export const getAllPermissions = () => {
  return Object.values(PERMISSION_TYPES);
};

export const getPermissionsByCategory = (category) => {
  return PERMISSION_CATEGORIES[category]?.permissions || [];
};

export const getPermissionDescription = (permission) => {
  return PERMISSION_DESCRIPTIONS[permission] || 'No description available';
};

export const hasPermission = (userPermissions, permission) => {
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (userPermissions, permissions) => {
  return permissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (userPermissions, permissions) => {
  return permissions.every(permission => userPermissions.includes(permission));
};

// Company and Project Access Types
export const ACCESS_TYPES = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
};

// User Access Structure
export const createUserAccess = (companyId, projectIds = [], permissions = []) => {
  return {
    companyId,
    projectIds, // Array of project IDs user can access
    permissions, // Array of permission types
    accessType: ACCESS_TYPES.READ, // Default access type
    grantedBy: null, // User ID who granted access
    grantedAt: new Date().toISOString(),
    expiresAt: null // Optional expiration date
  };
};

// Validate user access to a resource
export const validateAccess = (user, resourceType, resourceId, action) => {
  // Check if user has system admin permission
  if (user.permissions?.includes(PERMISSION_TYPES.SYSTEM_ADMIN)) {
    return true;
  }
  
  // Check specific permissions based on resource type and action
  const requiredPermission = getRequiredPermission(resourceType, action);
  if (requiredPermission && user.permissions?.includes(requiredPermission)) {
    return true;
  }
  
  // Check company/project specific access
  if (user.companyAccess) {
    const hasCompanyAccess = user.companyAccess.some(access => 
      access.companyId === resourceId && 
      access.permissions.includes(requiredPermission)
    );
    if (hasCompanyAccess) return true;
  }
  
  return false;
};

// Get required permission for action
const getRequiredPermission = (resourceType, action) => {
  const permissionMap = {
    'user': {
      'create': PERMISSION_TYPES.CREATE_USERS,
      'read': PERMISSION_TYPES.VIEW_USERS,
      'update': PERMISSION_TYPES.EDIT_USERS,
      'delete': PERMISSION_TYPES.DELETE_USERS
    },
    'company': {
      'create': PERMISSION_TYPES.CREATE_COMPANIES,
      'read': PERMISSION_TYPES.VIEW_COMPANIES,
      'update': PERMISSION_TYPES.EDIT_COMPANIES,
      'delete': PERMISSION_TYPES.DELETE_COMPANIES
    },
    'project': {
      'create': PERMISSION_TYPES.CREATE_PROJECTS,
      'read': PERMISSION_TYPES.VIEW_PROJECTS,
      'update': PERMISSION_TYPES.EDIT_PROJECTS,
      'delete': PERMISSION_TYPES.DELETE_PROJECTS
    },
    'application': {
      'create': PERMISSION_TYPES.CREATE_APPLICATIONS,
      'read': PERMISSION_TYPES.VIEW_APPLICATIONS,
      'update': PERMISSION_TYPES.EDIT_APPLICATIONS,
      'delete': PERMISSION_TYPES.DELETE_APPLICATIONS
    }
  };
  
  return permissionMap[resourceType]?.[action];
};
