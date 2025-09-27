export interface Company {
  CompanyID: string;
  CompanyName: string;
  State: string;
  Address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  ProjectManager: {
    name: string;
    email: string;
    phone?: string;
  };
  ExecutiveSponsor: {
    name: string;
    email: string;
    phone?: string;
  };
  IntegrationSettings: {
    teams: {
      enabled: boolean;
      webhookUrl?: string;
      channelName?: string;
      botId?: string;
    };
    confluence: {
      enabled: boolean;
      url?: string;
      username?: string;
      apiToken?: string;
      spaceKey?: string;
    };
  };
  CompanyLogo?: {
    url: string;
    fileName: string;
    uploadedAt: string;
  };
  CompanyDistribution?: {
    type: 'internal' | 'external' | 'both';
    distributionList: string[];
  };
  ProjectLocation: 'AWS' | 'Azure' | 'On-Premises' | 'Google Cloud' | 'Multi-Cloud' | 'Other';
  Projects: string[]; // Array of project IDs
  ServiceNowProjectCode?: string;
  SageProjectCode?: string;
  Notes?: string;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string;
  Status: 'active' | 'inactive' | 'archived';
  CompanyFiles: CompanyFile[];
}

export interface CompanyFile {
  FileID: string;
  FileName: string;
  FileType: 'SOW' | 'Charter' | 'Contract' | 'Logo' | 'Other';
  FileSize: number;
  FileUrl: string;
  UploadedAt: string;
  UploadedBy: string;
  Description?: string;
  Version?: string;
}

export interface CompanyProject {
  ProjectID: string;
  ProjectName: string;
  ProjectDescription: string;
  Status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  StartDate: string;
  EndDate?: string;
  Location: string;
  CreatedAt: string;
  LastUpdated: string;
}

export interface CompanyStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalApplications: number;
  totalFiles: number;
  storageUsed: number;
  lastActivity: string;
}
