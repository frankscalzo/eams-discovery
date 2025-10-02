// Enhanced User Types and Roles for EAMS with Company-Based Permissions
export const USER_TYPES = {
  PRIMARY_ADMIN: 'primary_admin',
  PRIMARY_SUPER_USER: 'primary_super_user',
  PRIMARY_STANDARD_USER: 'primary_standard_user',
  PRIMARY_READ_ONLY: 'primary_read_only',
  COMPANY_ADMIN: 'company_admin',
  COMPANY_SUPER_USER: 'company_super_user',
  COMPANY_STANDARD_USER: 'company_standard_user',
  COMPANY_READ_ONLY: 'company_read_only'
};

export const USER_ROLES = {
  [USER_TYPES.PRIMARY_ADMIN]: {
    name: 'Primary Company Admin',
    description: 'Full system access including all companies and users',
    permissions: ['read_all', 'write_all', 'admin_all', 'manage_users', 'manage_companies', 'manage_primary_company'],
    canAccessAllProjects: true,
    canAccessAllCompanies: true,
    canManageUsers: true,
    canManageCompanies: true,
    canManagePrimaryCompany: true,
    isPrimaryCompany: true,
    level: 'admin'
  },
  [USER_TYPES.PRIMARY_SUPER_USER]: {
    name: 'Primary Company Super User',
    description: 'Full access to primary company with granular company permissions',
    permissions: ['read_all', 'write_all', 'admin_all', 'manage_users', 'manage_companies'],
    canAccessAllProjects: true,
    canAccessAllCompanies: false, // Can be granted access to specific companies
    canManageUsers: true,
    canManageCompanies: true,
    canManagePrimaryCompany: true,
    isPrimaryCompany: true,
    level: 'super_user'
  },
  [USER_TYPES.PRIMARY_STANDARD_USER]: {
    name: 'Primary Company Standard User',
    description: 'Standard access to primary company with limited permissions',
    permissions: ['read_all', 'write_all'],
    canAccessAllProjects: true,
    canAccessAllCompanies: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: true,
    level: 'standard'
  },
  [USER_TYPES.PRIMARY_READ_ONLY]: {
    name: 'Primary Company Read Only',
    description: 'Read-only access to primary company data',
    permissions: ['read_all'],
    canAccessAllProjects: true,
    canAccessAllCompanies: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: true,
    level: 'read_only'
  },
  [USER_TYPES.COMPANY_ADMIN]: {
    name: 'Company Admin',
    description: 'Full access to assigned company only',
    permissions: ['read_company', 'write_company', 'admin_company', 'manage_company_users'],
    canAccessAllProjects: false,
    canAccessAllCompanies: false,
    canManageUsers: true, // Only within their company
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: false,
    level: 'admin'
  },
  [USER_TYPES.COMPANY_SUPER_USER]: {
    name: 'Company Super User',
    description: 'Advanced access to assigned company',
    permissions: ['read_company', 'write_company', 'admin_company'],
    canAccessAllProjects: false,
    canAccessAllCompanies: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: false,
    level: 'super_user'
  },
  [USER_TYPES.COMPANY_STANDARD_USER]: {
    name: 'Company Standard User',
    description: 'Standard access to assigned company',
    permissions: ['read_company', 'write_company'],
    canAccessAllProjects: false,
    canAccessAllCompanies: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: false,
    level: 'standard'
  },
  [USER_TYPES.COMPANY_READ_ONLY]: {
    name: 'Company Read Only',
    description: 'Read-only access to assigned company',
    permissions: ['read_company'],
    canAccessAllProjects: false,
    canAccessAllCompanies: false,
    canManageUsers: false,
    canManageCompanies: false,
    canManagePrimaryCompany: false,
    isPrimaryCompany: false,
    level: 'read_only'
  }
};

export const PERMISSIONS = {
  // Global permissions
  READ_ALL: 'read_all',
  WRITE_ALL: 'write_all',
  ADMIN_ALL: 'admin_all',
  MANAGE_USERS: 'manage_users',
  MANAGE_COMPANIES: 'manage_companies',
  MANAGE_PRIMARY_COMPANY: 'manage_primary_company',
  
  // Company-specific permissions
  READ_COMPANY: 'read_company',
  WRITE_COMPANY: 'write_company',
  ADMIN_COMPANY: 'admin_company',
  MANAGE_COMPANY_USERS: 'manage_company_users',
  
  // Project permissions
  READ_PROJECT: 'read_project',
  WRITE_PROJECT: 'write_project',
  ADMIN_PROJECT: 'admin_project',
  
  // Application permissions
  READ_APPLICATION: 'read_application',
  WRITE_APPLICATION: 'write_application',
  DELETE_APPLICATION: 'delete_application'
};

export const COMPANY_ACCESS_LEVELS = {
  FULL_ACCESS: 'full_access',
  LIMITED_ACCESS: 'limited_access',
  READ_ONLY_ACCESS: 'read_only_access',
  NO_ACCESS: 'no_access'
};

// Helper functions
export const getUserTypeInfo = (userType) => {
  return USER_ROLES[userType] || USER_ROLES[USER_TYPES.COMPANY_READ_ONLY];
};

export const hasPermission = (user, permission) => {
  const userInfo = getUserTypeInfo(user.userType);
  return userInfo.permissions.includes(permission);
};

export const canAccessProject = (user, projectId) => {
  const userInfo = getUserTypeInfo(user.userType);
  
  // Primary company users can access all projects
  if (userInfo.canAccessAllProjects) {
    return true;
  }
  
  // Company users can only access projects within their company
  return user.assignedProjects?.includes(projectId) || false;
};

export const canAccessCompany = (user, companyId) => {
  const userInfo = getUserTypeInfo(user.userType);
  
  // Primary company users can access all companies
  if (userInfo.canAccessAllCompanies) {
    return true;
  }
  
  // Primary company super users can be granted access to specific companies
  if (userInfo.isPrimaryCompany && userInfo.level === 'super_user') {
    return user.companyAccess?.includes(companyId) || user.primaryCompanyId === companyId;
  }
  
  // Company users can only access their assigned company
  return user.assignedCompanyId === companyId;
};

export const canManageUsers = (user, targetCompanyId = null) => {
  const userInfo = getUserTypeInfo(user.userType);
  
  // Primary company admins can manage all users
  if (userInfo.canManageUsers && userInfo.isPrimaryCompany && userInfo.level === 'admin') {
    return true;
  }
  
  // Primary company super users can manage users in companies they have access to
  if (userInfo.canManageUsers && userInfo.isPrimaryCompany && userInfo.level === 'super_user') {
    if (!targetCompanyId) return true;
    return user.companyAccess?.includes(targetCompanyId) || user.primaryCompanyId === targetCompanyId;
  }
  
  // Company admins can only manage users within their company
  if (userInfo.canManageUsers && !userInfo.isPrimaryCompany) {
    return !targetCompanyId || user.assignedCompanyId === targetCompanyId;
  }
  
  return false;
};

export const canManageCompanies = (user) => {
  const userInfo = getUserTypeInfo(user.userType);
  return userInfo.canManageCompanies;
};

export const isPrimaryCompanyUser = (user) => {
  const userInfo = getUserTypeInfo(user.userType);
  return userInfo.isPrimaryCompany;
};

export const getUserLevel = (user) => {
  const userInfo = getUserTypeInfo(user.userType);
  return userInfo.level;
};

export const canAccessAllCompanies = (user) => {
  const userInfo = getUserTypeInfo(user.userType);
  return userInfo.canAccessAllCompanies;
};

export const getCompanyAccessLevel = (user, companyId) => {
  const userInfo = getUserTypeInfo(user.userType);
  
  // Primary company users have full access to their company
  if (userInfo.isPrimaryCompany && user.primaryCompanyId === companyId) {
    return COMPANY_ACCESS_LEVELS.FULL_ACCESS;
  }
  
  // Check if user has specific access to this company
  if (user.companyAccess) {
    const access = user.companyAccess.find(access => access.companyId === companyId);
    if (access) {
      return access.level;
    }
  }
  
  // Default to no access
  return COMPANY_ACCESS_LEVELS.NO_ACCESS;
};

export const getAvailableUserTypes = (currentUser) => {
  const currentUserInfo = getUserTypeInfo(currentUser.userType);
  
  if (currentUserInfo.level === 'admin' && currentUserInfo.isPrimaryCompany) {
    // Primary admin can create any user type
    return Object.values(USER_TYPES);
  }
  
  if (currentUserInfo.level === 'super_user' && currentUserInfo.isPrimaryCompany) {
    // Primary super user can create company users and primary users (except admin)
    return [
      USER_TYPES.PRIMARY_SUPER_USER,
      USER_TYPES.PRIMARY_STANDARD_USER,
      USER_TYPES.PRIMARY_READ_ONLY,
      USER_TYPES.COMPANY_ADMIN,
      USER_TYPES.COMPANY_SUPER_USER,
      USER_TYPES.COMPANY_STANDARD_USER,
      USER_TYPES.COMPANY_READ_ONLY
    ];
  }
  
  if (currentUserInfo.level === 'admin' && !currentUserInfo.isPrimaryCompany) {
    // Company admin can create users within their company
    return [
      USER_TYPES.COMPANY_SUPER_USER,
      USER_TYPES.COMPANY_STANDARD_USER,
      USER_TYPES.COMPANY_READ_ONLY
    ];
  }
  
  // No permission to create users
  return [];
};
