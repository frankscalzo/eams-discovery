// Mock API for development without AWS credentials
const mockCompanies = [
  {
    CompanyID: 'comp-1',
    CompanyName: 'Optimum Cloud Services',
    Address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA'
    },
    ProjectManager: {
      name: 'Frank Scalzo',
      email: 'fscalzo@optimumhit.com',
      phone: '555-0123'
    },
    ExecutiveSponsor: {
      name: 'Jane Smith',
      email: 'jane@optimumhit.com',
      phone: '555-0124'
    },
    ProjectLocation: 'AWS',
    ServiceNowProjectCode: 'SN001',
    SageProjectCode: 'SG001',
    Notes: 'Primary development company',
    CreatedAt: '2024-01-01T00:00:00Z',
    UpdatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockProjects = [
  {
    ProjectID: 'proj-1',
    ProjectName: 'EAMS Development',
    Description: 'Enterprise Architecture Management System development project',
    Status: 'ACTIVE',
    Budget: 100000,
    CompanyID: 'comp-1',
    CreatedAt: '2024-01-01T00:00:00Z',
    UpdatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockUsers = [
  {
    UserID: 'user-1',
    Username: 'fscalzo',
    Email: 'fscalzo@optimumhit.com',
    FirstName: 'Frank',
    LastName: 'Scalzo',
    UserType: 'admin',
    AssignedProjects: [],
    IsActive: true,
    CreatedAt: '2024-01-01T00:00:00Z',
    UpdatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockApplications = [
  {
    ApplicationID: 'app-1',
    ProjectID: 'proj-1',
    ApplicationName: 'EAMS Web Application',
    ApplicationDescription: 'Main web application for the Enterprise Architecture Management System',
    Team: 'Development Team',
    Owner: 'Frank Scalzo',
    Manager: 'Jane Manager',
    EpicTicket: 'EPIC-001',
    TestPlanReady: true,
    TestingStatus: 'In Progress',
    Confidence: 85,
    TestingNotes: 'Testing is going well',
    IntegrationType: 'REST API',
    IntegrationDetails: 'Connects to external services',
    ROI: 150000,
    RTO: 4,
    RPO: 1,
    EAMSData: {
      criticality: 'High',
      vendor: 'Internal',
      vendorContact: 'fscalzo@optimumhit.com',
      longTermGoal: 'Invest',
      containsPHI: false,
      supportGroup: 'IT Support'
    },
    CreatedAt: '2024-01-01T00:00:00Z',
    UpdatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockAPI = {
  companyAPI: {
    async getCompanies() {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockCompanies), 100);
      });
    },
    async createCompany(companyData) {
      const newCompany = {
        CompanyID: `comp-${Date.now()}`,
        ...companyData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      mockCompanies.push(newCompany);
      return { success: true, company: newCompany };
    },
    async updateCompany(companyId, updates) {
      const index = mockCompanies.findIndex(c => c.CompanyID === companyId);
      if (index !== -1) {
        mockCompanies[index] = { ...mockCompanies[index], ...updates, UpdatedAt: new Date().toISOString() };
        return { success: true };
      }
      return { success: false, error: 'Company not found' };
    },
    async deleteCompany(companyId) {
      const index = mockCompanies.findIndex(c => c.CompanyID === companyId);
      if (index !== -1) {
        mockCompanies.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: 'Company not found' };
    },
    async getCompanyStats(companyId) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            totalProjects: mockProjects.filter(p => p.CompanyID === companyId).length,
            activeProjects: mockProjects.filter(p => p.CompanyID === companyId && p.Status === 'ACTIVE').length,
            totalApplications: mockApplications.filter(a => a.ProjectID === mockProjects.find(p => p.CompanyID === companyId)?.ProjectID).length
          });
        }, 100);
      });
    }
  },
  projectAPI: {
    async getProjects() {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockProjects), 100);
      });
    },
    async createProject(projectData) {
      const newProject = {
        ProjectID: `proj-${Date.now()}`,
        ...projectData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      mockProjects.push(newProject);
      return { success: true, project: newProject };
    },
    async updateProject(projectId, updates) {
      const index = mockProjects.findIndex(p => p.ProjectID === projectId);
      if (index !== -1) {
        mockProjects[index] = { ...mockProjects[index], ...updates, UpdatedAt: new Date().toISOString() };
        return { success: true };
      }
      return { success: false, error: 'Project not found' };
    },
    async deleteProject(projectId) {
      const index = mockProjects.findIndex(p => p.ProjectID === projectId);
      if (index !== -1) {
        mockProjects.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: 'Project not found' };
    }
  },
  userAPI: {
    async getUsers() {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, users: mockUsers, total: mockUsers.length }), 100);
      });
    },
    async createUser(userData) {
      const newUser = {
        UserID: `user-${Date.now()}`,
        ...userData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      mockUsers.push(newUser);
      return { success: true, user: newUser };
    },
    async updateUser(userId, updates) {
      const index = mockUsers.findIndex(u => u.UserID === userId);
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], ...updates, UpdatedAt: new Date().toISOString() };
        return { success: true, user: mockUsers[index] };
      }
      return { success: false, error: 'User not found' };
    },
    async deleteUser(userId) {
      const index = mockUsers.findIndex(u => u.UserID === userId);
      if (index !== -1) {
        mockUsers.splice(index, 1);
        return { success: true, user: { UserID: userId } };
      }
      return { success: false, error: 'User not found' };
    }
  },
  applicationAPI: {
    async getApplications(projectId) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const apps = projectId ? mockApplications.filter(app => app.ProjectID === projectId) : mockApplications;
          resolve(apps);
        }, 100);
      });
    },
    async createApplication(applicationData) {
      const newApplication = {
        ApplicationID: `app-${Date.now()}`,
        ...applicationData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      mockApplications.push(newApplication);
      return { success: true, application: newApplication };
    },
    async updateApplication(applicationId, updates) {
      const index = mockApplications.findIndex(a => a.ApplicationID === applicationId);
      if (index !== -1) {
        mockApplications[index] = { ...mockApplications[index], ...updates, UpdatedAt: new Date().toISOString() };
        return { success: true };
      }
      return { success: false, error: 'Application not found' };
    },
    async deleteApplication(applicationId) {
      const index = mockApplications.findIndex(a => a.ApplicationID === applicationId);
      if (index !== -1) {
        mockApplications.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: 'Application not found' };
    }
  }
};

export default mockAPI;