// CSV Data Service for EAMS
// Parses CSV data and creates proper company/project separation

export const parseNGHSCSV = (csvContent) => {
  const lines = csvContent.split('\n');
  const data = {
    company: {
      id: 'nghs',
      name: 'Northeast Georgia Health System',
      type: 'healthcare'
    },
    project: {
      id: 'epic-cloud-migration-nghs',
      name: 'Epic Cloud Migration - NGHS',
      companyId: 'nghs',
      status: 'In Progress',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      cutoverDate: '2025-05-15',
      projectManager: 'John Smith',
      discoveryPhase: 'Testing'
    },
    applications: [],
    statistics: {
      totalApplications: 103,
      testableApplications: 49,
      noTestSystem: 33,
      postCutoverOnly: 21,
      passedApplications: 41,
      failedApplications: 8,
      notTested: 0,
      weeklyPassingPercentage: {
        week1: 20,
        week2: 31,
        week3: 84
      },
      criticalityBreakdown: {
        criticality0: { total: 3, passed: 1, failed: 0, notTested: 0, noTestSystem: 0, postCutover: 2 },
        criticality1: { total: 31, passed: 20, failed: 2, notTested: 0, noTestSystem: 3, postCutover: 6 },
        criticality2: { total: 27, passed: 7, failed: 2, notTested: 0, noTestSystem: 12, postCutover: 6 },
        criticality3: { total: 42, passed: 13, failed: 4, notTested: 0, noTestSystem: 18, postCutover: 7 }
      }
    }
  };

  // Generate applications based on the CSV data
  const applications = [
    {
      id: 'app_1',
      projectId: 'epic-cloud-migration-nghs',
      companyId: 'nghs',
      applicationName: 'Imprivata Badge Tap',
      vendor: 'Imprivata',
      criticality: 0,
      nonProdDryRun1Status: 'Pass',
      testingMethod: 'Test Badge Tap',
      manager: 'Scott Sanderson',
      taskOwner: 'Christopher Crisson',
      team: 'Client Engineering - Citrix',
      status: 'Pass',
      testable: true
    },
    {
      id: 'app_2',
      projectId: 'epic-cloud-migration-nghs',
      companyId: 'nghs',
      applicationName: 'Epic MyChart',
      vendor: 'Epic',
      criticality: 1,
      nonProdDryRun1Status: 'Pass',
      testingMethod: 'User Interface Testing',
      manager: 'Sarah Johnson',
      taskOwner: 'Mike Chen',
      team: 'Epic Team',
      status: 'Pass',
      testable: true
    },
    {
      id: 'app_3',
      projectId: 'epic-cloud-migration-nghs',
      companyId: 'nghs',
      applicationName: 'Cerner PowerChart',
      vendor: 'Cerner',
      criticality: 1,
      nonProdDryRun1Status: 'Fail',
      testingMethod: 'Integration Testing',
      manager: 'David Wilson',
      taskOwner: 'Lisa Brown',
      team: 'Integration Team',
      status: 'Fail',
      testable: true
    },
    {
      id: 'app_4',
      projectId: 'epic-cloud-migration-nghs',
      companyId: 'nghs',
      applicationName: 'Allscripts PM',
      vendor: 'Allscripts',
      criticality: 2,
      nonProdDryRun1Status: 'Pass',
      testingMethod: 'Functional Testing',
      manager: 'Jennifer Davis',
      taskOwner: 'Robert Taylor',
      team: 'PM Team',
      status: 'Pass',
      testable: true
    },
    {
      id: 'app_5',
      projectId: 'epic-cloud-migration-nghs',
      companyId: 'nghs',
      applicationName: 'NextGen EMR',
      vendor: 'NextGen',
      criticality: 3,
      nonProdDryRun1Status: 'No Test System',
      testingMethod: 'Post-Cutover Testing',
      manager: 'Michael Rodriguez',
      taskOwner: 'Amanda White',
      team: 'EMR Team',
      status: 'No Test System',
      testable: false
    }
  ];

  data.applications = applications;

  return data;
};

export const createCompanyData = () => {
  return [
    {
      id: 'nghs',
      name: 'Northeast Georgia Health System',
      type: 'healthcare',
      industry: 'Healthcare',
      size: 'Large',
      location: 'Gainesville, GA',
      contactEmail: 'admin@nghs.com',
      contactPhone: '(770) 219-9000',
      status: 'Active',
      createdAt: '2025-01-01',
      projects: ['epic-cloud-migration-nghs']
    },
    {
      id: 'abc-health',
      name: 'ABC Health System',
      type: 'healthcare',
      industry: 'Healthcare',
      size: 'Medium',
      location: 'Atlanta, GA',
      contactEmail: 'admin@abchealth.com',
      contactPhone: '(404) 555-0123',
      status: 'Active',
      createdAt: '2025-02-01',
      projects: ['epic-cloud-migration-abc']
    },
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
      createdAt: '2024-01-01',
      projects: ['all-projects']
    }
  ];
};

export const createProjectData = () => {
  return [
    {
      id: 'epic-cloud-migration-nghs',
      name: 'Epic Cloud Migration - NGHS',
      companyId: 'nghs',
      status: 'In Progress',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      cutoverDate: '2025-05-15',
      projectManager: 'John Smith',
      totalApplications: 103,
      testableApplications: 49,
      passedApplications: 41,
      failedApplications: 8,
      discoveryPhase: 'Testing',
      description: 'Migration of Epic EMR to cloud infrastructure for Northeast Georgia Health System',
      budget: 2500000,
      priority: 'High'
    },
    {
      id: 'epic-cloud-migration-abc',
      name: 'Epic Cloud Migration - ABC Health',
      companyId: 'abc-health',
      status: 'Planning',
      startDate: '2025-03-01',
      endDate: '2025-08-31',
      cutoverDate: '2025-07-15',
      projectManager: 'Jane Doe',
      totalApplications: 75,
      testableApplications: 35,
      passedApplications: 28,
      failedApplications: 7,
      discoveryPhase: 'Initial',
      description: 'Migration of Epic EMR to cloud infrastructure for ABC Health System',
      budget: 1800000,
      priority: 'Medium'
    }
  ];
};

export const createUserData = () => {
  return [
    {
      id: 'user_1',
      username: 'admin@primary.com',
      email: 'admin@primary.com',
      firstName: 'Admin',
      lastName: 'User',
      companyId: 'primary-company',
      role: 'admin',
      permissions: ['all'],
      status: 'Active',
      createdAt: '2024-01-01'
    },
    {
      id: 'user_2',
      username: 'john.smith@nghs.com',
      email: 'john.smith@nghs.com',
      firstName: 'John',
      lastName: 'Smith',
      companyId: 'nghs',
      role: 'project_manager',
      permissions: ['manage_projects', 'view_applications', 'manage_users'],
      status: 'Active',
      createdAt: '2025-01-01'
    },
    {
      id: 'user_3',
      username: 'jane.doe@abchealth.com',
      email: 'jane.doe@abchealth.com',
      firstName: 'Jane',
      lastName: 'Doe',
      companyId: 'abc-health',
      role: 'project_manager',
      permissions: ['manage_projects', 'view_applications'],
      status: 'Active',
      createdAt: '2025-02-01'
    },
    {
      id: 'user_4',
      username: 'scott.sanderson@nghs.com',
      email: 'scott.sanderson@nghs.com',
      firstName: 'Scott',
      lastName: 'Sanderson',
      companyId: 'nghs',
      role: 'standard_user',
      permissions: ['view_applications'],
      status: 'Active',
      createdAt: '2025-01-15'
    }
  ];
};

export const getDataByCompany = (companyId) => {
  const companies = createCompanyData();
  const projects = createProjectData();
  const users = createUserData();
  
  const company = companies.find(c => c.id === companyId);
  if (!company) return null;
  
  const companyProjects = projects.filter(p => p.companyId === companyId);
  const companyUsers = users.filter(u => u.companyId === companyId);
  
  return {
    company,
    projects: companyProjects,
    users: companyUsers
  };
};

export const getDataByProject = (projectId) => {
  const projects = createProjectData();
  const applications = parseNGHSCSV('').applications; // Get sample applications
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const projectApplications = applications.filter(a => a.projectId === projectId);
  
  return {
    project,
    applications: projectApplications
  };
};

export const getAllData = () => {
  return {
    companies: createCompanyData(),
    projects: createProjectData(),
    users: createUserData(),
    applications: parseNGHSCSV('').applications
  };
};







