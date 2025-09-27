// Enterprise Architecture Management System (EAMS) Data Types

export interface FactSheet {
  id: string;
  type: FactSheetType;
  name: string;
  description?: string;
  status: LifecycleStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  // Common attributes
  owner?: string;
  cost?: number;
  criticality: CriticalityLevel;
  // Type-specific data
  data: ApplicationData | BusinessCapabilityData | ITComponentData | ProjectData;
}

export type FactSheetType = 
  | 'APPLICATION' 
  | 'BUSINESS_CAPABILITY' 
  | 'IT_COMPONENT' 
  | 'PROJECT' 
  | 'DATA_OBJECT' 
  | 'INTERFACE' 
  | 'PROVIDER';

export type LifecycleStatus = 
  | 'PLANNED' 
  | 'ACTIVE' 
  | 'PHASE_OUT' 
  | 'SUNSET';

export type CriticalityLevel = 
  | 'CRITICAL' 
  | 'HIGH' 
  | 'MEDIUM' 
  | 'LOW';

// Application-specific data
export interface ApplicationData {
  applicationName: string;
  applicationDescription: string;
  teams: string[];
  owner: Person;
  manager: Person;
  epicTicket?: string;
  testPlanReady: boolean;
  testingStatus: TestingStatus;
  confidence: number;
  testingNotes?: string;
  integrationType: IntegrationType;
  integrationDetails: IntegrationDetail[];
  roi?: number;
  rto?: number;
  rpo?: number;
  discoveryQuestions: DiscoveryQuestion[];
  eamsData: EAMSApplicationData;
  technicalSpecs: TechnicalSpecs;
  businessValue: BusinessValue;
}

export interface Person {
  fullName: string;
  email: string;
  department?: string;
}

export type TestingStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'BLOCKED' 
  | 'FAILED';

export type IntegrationType = 
  | 'API' 
  | 'DATABASE' 
  | 'FILE_TRANSFER' 
  | 'MESSAGE_QUEUE' 
  | 'WEB_SERVICE' 
  | 'OTHER';

export interface IntegrationDetail {
  type: IntegrationType;
  endpoint?: string;
  ips?: string[];
  description?: string;
}

export interface DiscoveryQuestion {
  question: string;
  answer?: string;
  category: 'VENDOR' | 'LICENSING' | 'INTEGRATION' | 'AUTHENTICATION' | 'ENVIRONMENT' | 'CHANGES' | 'LATENCY';
}

export interface EAMSApplicationData {
  criticality: CriticalityLevel;
  containsPHI: boolean;
  vendorName?: string;
  vendorContact?: Person;
  longTermGoal: 'INVEST' | 'MAINTAIN' | 'DEPRECATE';
  supportGroup?: string;
  director?: Person;
}

export interface TechnicalSpecs {
  platform?: string;
  technology?: string[];
  database?: string;
  hosting?: 'ON_PREMISE' | 'CLOUD' | 'HYBRID';
  architecture?: string;
  scalability?: string;
  securityLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BusinessValue {
  businessCapability?: string;
  process?: string;
  users?: number;
  revenue?: number;
  costSavings?: number;
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Business Capability data
export interface BusinessCapabilityData {
  capabilityName: string;
  description: string;
  level: number; // 1-5 hierarchy level
  parentCapability?: string;
  owner: Person;
  maturity: MaturityLevel;
  businessValue: number;
  applications: string[]; // Application IDs
}

export type MaturityLevel = 
  | 'INITIAL' 
  | 'DEVELOPING' 
  | 'DEFINED' 
  | 'MANAGED' 
  | 'OPTIMIZING';

// IT Component data
export interface ITComponentData {
  componentName: string;
  description: string;
  type: ITComponentType;
  vendor?: string;
  version?: string;
  lifecycleStatus: LifecycleStatus;
  applications: string[]; // Application IDs
  technicalSpecs: TechnicalSpecs;
}

export type ITComponentType = 
  | 'DATABASE' 
  | 'MIDDLEWARE' 
  | 'OPERATING_SYSTEM' 
  | 'HARDWARE' 
  | 'NETWORK' 
  | 'SECURITY' 
  | 'MONITORING' 
  | 'OTHER';

// Project data
export interface ProjectData {
  projectName: string;
  description: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  applications: string[]; // Application IDs
  businessCapabilities: string[]; // Business Capability IDs
  stakeholders: Person[];
}

export type ProjectStatus = 
  | 'PLANNING' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'CANCELLED';

// Dependency and relationship types
export interface Dependency {
  id: string;
  sourceId: string;
  targetId: string;
  type: DependencyType;
  strength: DependencyStrength;
  description?: string;
  critical: boolean;
  bidirectional: boolean;
}

export type DependencyType = 
  | 'DEPENDS_ON' 
  | 'INTEGRATES_WITH' 
  | 'REPLACES' 
  | 'SUPPORTS' 
  | 'CONSUMES' 
  | 'PROVIDES';

export type DependencyStrength = 
  | 'STRONG' 
  | 'MEDIUM' 
  | 'WEAK';

// Inventory view filters and sorting
export interface InventoryFilter {
  factSheetTypes?: FactSheetType[];
  status?: LifecycleStatus[];
  criticality?: CriticalityLevel[];
  tags?: string[];
  searchTerm?: string;
  projectId?: string;
  owner?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface InventorySort {
  field: string;
  direction: 'asc' | 'desc';
}

// Reporting types
export interface InventoryReport {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  filters: InventoryFilter;
  columns: string[];
  groupBy?: string;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}

export type ReportType = 
  | 'INVENTORY' 
  | 'DEPENDENCY_MATRIX' 
  | 'LIFECYCLE_ANALYSIS' 
  | 'COST_ANALYSIS' 
  | 'RISK_ASSESSMENT' 
  | 'IMPACT_ANALYSIS';

// Impact analysis
export interface ImpactAnalysis {
  sourceId: string;
  affectedFactSheets: string[];
  impactType: 'CHANGE' | 'DEPRECATION' | 'MIGRATION' | 'UPGRADE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendations: string[];
  estimatedCost?: number;
  estimatedEffort?: number;
}
