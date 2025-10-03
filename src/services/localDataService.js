// Local Data Service for EAMS
// Manages data in browser localStorage with proper company/user separation

const STORAGE_KEYS = {
  COMPANIES: 'eams_companies',
  USERS: 'eams_users',
  PROJECTS: 'eams_projects',
  APPLICATIONS: 'eams_applications',
  CURRENT_USER: 'eams_current_user'
};

// Initialize default data if none exists
export const initializeDefaultData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
    const defaultCompanies = [
      {
        id: 'primary-company',
        name: 'Primary Company',
        type: 'admin',
        industry: 'Technology',
        size: 'Enterprise',
        location: 'Global',
        contactEmail: 'admin@primary.com',
        contactPhone: '(555) 123-4567',
        status: 'Active',
        createdAt: new Date().toISOString(),
        projects: []
      }
    ];
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(defaultCompanies));
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers = [
      {
        id: 'admin-user',
        username: 'admin',
        email: 'admin@primary.com',
        firstName: 'Admin',
        lastName: 'User',
        companyId: 'primary-company',
        role: 'admin',
        permissions: ['all'],
        status: 'Active',
        createdAt: new Date().toISOString(),
        password: 'admin123' // In real app, this would be hashed
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
  }
};

// Company Management
export const getCompanies = () => {
  const companies = localStorage.getItem(STORAGE_KEYS.COMPANIES);
  return companies ? JSON.parse(companies) : [];
};

export const getCompanyById = (id) => {
  const companies = getCompanies();
  return companies.find(company => company.id === id);
};

export const createCompany = (companyData) => {
  const companies = getCompanies();
  const newCompany = {
    id: `company_${Date.now()}`,
    ...companyData,
    createdAt: new Date().toISOString(),
    projects: []
  };
  companies.push(newCompany);
  localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  return newCompany;
};

export const updateCompany = (id, updateData) => {
  const companies = getCompanies();
  const index = companies.findIndex(company => company.id === id);
  if (index !== -1) {
    companies[index] = { ...companies[index], ...updateData };
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
    return companies[index];
  }
  return null;
};

export const deleteCompany = (id) => {
  const companies = getCompanies();
  const filteredCompanies = companies.filter(company => company.id !== id);
  localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(filteredCompanies));
  return true;
};

// User Management
export const getUsers = () => {
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  return users ? JSON.parse(users) : [];
};

export const getUsersByCompany = (companyId) => {
  const users = getUsers();
  return users.filter(user => user.companyId === companyId);
};

export const getUserById = (id) => {
  const users = getUsers();
  return users.find(user => user.id === id);
};

export const createUser = (userData) => {
  const users = getUsers();
  const newUser = {
    id: `user_${Date.now()}`,
    ...userData,
    createdAt: new Date().toISOString(),
    status: 'Active'
  };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return newUser;
};

export const updateUser = (id, updateData) => {
  const users = getUsers();
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updateData };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return users[index];
  }
  return null;
};

export const deleteUser = (id) => {
  const users = getUsers();
  const filteredUsers = users.filter(user => user.id !== id);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
  return true;
};

// Project Management
export const getProjects = () => {
  const projects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return projects ? JSON.parse(projects) : [];
};

export const getProjectsByCompany = (companyId) => {
  const projects = getProjects();
  return projects.filter(project => project.companyId === companyId);
};

export const getProjectById = (id) => {
  const projects = getProjects();
  return projects.find(project => project.id === id);
};

export const createProject = (projectData) => {
  const projects = getProjects();
  const newProject = {
    id: `project_${Date.now()}`,
    ...projectData,
    createdAt: new Date().toISOString(),
    status: 'Planning'
  };
  projects.push(newProject);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  return newProject;
};

export const updateProject = (id, updateData) => {
  const projects = getProjects();
  const index = projects.findIndex(project => project.id === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updateData };
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return projects[index];
  }
  return null;
};

export const deleteProject = (id) => {
  const projects = getProjects();
  const filteredProjects = projects.filter(project => project.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filteredProjects));
  return true;
};

// Application Management
export const getApplications = () => {
  const applications = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
  return applications ? JSON.parse(applications) : [];
};

export const getApplicationsByProject = (projectId) => {
  const applications = getApplications();
  return applications.filter(app => app.projectId === projectId);
};

export const createApplication = (applicationData) => {
  const applications = getApplications();
  const newApplication = {
    id: `app_${Date.now()}`,
    ...applicationData,
    createdAt: new Date().toISOString()
  };
  applications.push(newApplication);
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
  return newApplication;
};

// Authentication
export const login = (username, password) => {
  const users = getUsers();
  const user = users.find(u => 
    (u.username === username || u.email === username) && 
    u.password === password && 
    u.status === 'Active'
  );
  
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }
  return null;
};

export const getCurrentUser = () => {
  const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.permissions.includes('all')) return true;
  return user.permissions.includes(permission);
};

// Data filtering based on user permissions
export const getFilteredData = (user) => {
  if (!user) return { companies: [], projects: [], users: [], applications: [] };
  
  const allCompanies = getCompanies();
  const allProjects = getProjects();
  const allUsers = getUsers();
  const allApplications = getApplications();
  
  if (hasPermission(user, 'all')) {
    // Admin can see everything
    return {
      companies: allCompanies,
      projects: allProjects,
      users: allUsers,
      applications: allApplications
    };
  } else {
    // Regular users can only see their company data
    return {
      companies: allCompanies.filter(c => c.id === user.companyId),
      projects: allProjects.filter(p => p.companyId === user.companyId),
      users: allUsers.filter(u => u.companyId === user.companyId),
      applications: allApplications.filter(a => a.companyId === user.companyId)
    };
  }
};

// Initialize data on first load
initializeDefaultData();





