import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  ContentCopy as CloneIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useBffAuth } from '../contexts/BffAuthContext';
import { useProject } from '../contexts/ProjectContext';
import BackButton from './BackButton';
import ProjectDiscoveryAPI from '../services/projectDiscoveryAPI';
import { getAllData, getDataByCompany, getDataByProject } from '../services/csvDataService';
import { getProjects, createProject, getCompanies } from '../services/localDataService';
import SimpleProjectForm from './SimpleProjectForm';

const ProjectDiscovery = () => {
  const { user: currentUser } = useBffAuth();
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [discoveryQuestions, setDiscoveryQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [simpleFormOpen, setSimpleFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Discovery sections
  const [discoverySections, setDiscoverySections] = useState([
    {
      id: 'company-overview',
      title: 'Company Overview',
      icon: BusinessIcon,
      questions: [
        { id: 'company-name', question: 'Company Name', answer: '', type: 'text' },
        { id: 'industry', question: 'Industry', answer: '', type: 'select', options: ['Healthcare', 'Finance', 'Manufacturing', 'Technology', 'Other'] },
        { id: 'company-size', question: 'Company Size', answer: '', type: 'select', options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
        { id: 'primary-location', question: 'Primary Location', answer: '', type: 'text' },
        { id: 'business-model', question: 'Business Model', answer: '', type: 'textarea' }
      ]
    },
    {
      id: 'it-infrastructure',
      title: 'IT Infrastructure',
      icon: SettingsIcon,
      questions: [
        { id: 'primary-os', question: 'Primary Operating System', answer: '', type: 'select', options: ['Windows', 'MacOS', 'Linux', 'Mixed'] },
        { id: 'cloud-provider', question: 'Cloud Provider', answer: '', type: 'select', options: ['AWS', 'Azure', 'GCP', 'On-Premise', 'Hybrid'] },
        { id: 'network-topology', question: 'Network Topology', answer: '', type: 'textarea' },
        { id: 'security-requirements', question: 'Security Requirements', answer: '', type: 'textarea' }
      ]
    },
    {
      id: 'applications',
      title: '3rd Party Applications',
      icon: StorageIcon,
      questions: [
        { id: 'app-inventory', question: 'Application Inventory', answer: '', type: 'table' }
      ]
    },
    {
      id: 'processes',
      title: 'Business Processes',
      icon: TimelineIcon,
      questions: [
        { id: 'key-processes', question: 'Key Business Processes', answer: '', type: 'textarea' },
        { id: 'compliance-requirements', question: 'Compliance Requirements', answer: '', type: 'textarea' }
      ]
    }
  ]);


  // Runbooks
  const [runbooks, setRunbooks] = useState([
    {
      id: 'rb-1',
      title: 'System Backup Procedures',
      category: 'Operations',
      steps: [
        'Verify backup storage availability',
        'Run automated backup scripts',
        'Verify backup integrity',
        'Document backup completion'
      ],
      lastUpdated: '2024-01-15'
    },
    {
      id: 'rb-2',
      title: 'User Onboarding Process',
      category: 'HR',
      steps: [
        'Create user account in AD',
        'Assign appropriate groups',
        'Provision hardware',
        'Schedule training'
      ],
      lastUpdated: '2024-01-10'
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load real data from localStorage
      console.log('Loading real project discovery data...');
      
      const projectsData = getProjects();
      setProjects(projectsData);
      
      // For now, keep the mock data for applications, contacts, etc.
      // This will be replaced with real data in future steps
      loadMockData();
    } catch (error) {
      console.error('Error loading data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Only set mock data for applications, contacts, issues, etc.
    // Projects are loaded from real data

    setApplications([
      {
        applicationId: 'app_1',
        projectId: 'proj_1',
        applicationName: 'Imprivata Badge Tap',
        vendor: 'Imprivata',
        criticality: 0,
        nonProdDryRun1Status: 'Pass',
        testingMethod: 'Test Badge Tap',
        manager: 'Scott Sanderson',
        taskOwner: 'Christopher Crisson',
        team: 'Client Engineering - Citrix'
      },
      {
        applicationId: 'app_2',
        projectId: 'proj_1',
        applicationName: 'Change Healthcare PACS',
        vendor: 'Change Healthcare',
        criticality: 1,
        nonProdDryRun1Status: 'Fail',
        testingMethod: 'Order placed in EPIC and arrived',
        manager: 'Tina Chapman',
        taskOwner: 'Rick Edwards',
        team: 'ANC RADIOLOGY'
      }
    ]);

    setContacts([
      {
        contactId: 'contact_1',
        projectId: 'proj_1',
        organization: 'NGHS',
        team: 'ECSA',
        role: 'ECSA',
        name: 'Steve Reagan',
        email: 'steve.reagan@nghs.com'
      }
    ]);

    setIssues([
      {
        issueId: 'issue_1',
        projectId: 'proj_1',
        issueNumber: '1',
        dateRaised: '2025-05-28',
        raisedBy: 'Marylynn O\'Reilly',
        issueSeverity: 'High',
        issueDescription: 'Glucommander did not launch',
        issueStatus: 'Closed'
      }
    ]);

    setDiscoveryQuestions([
      {
        questionId: 'q_1',
        projectId: 'proj_1',
        category: 'Infrastructure',
        question: 'What is the current server infrastructure?',
        answer: 'On-premises Epic servers',
        required: true
      }
    ]);
  };

  const handleCreateProject = () => {
    setSimpleFormOpen(true);
  };

  const handleCloneProject = async (project) => {
    try {
      // Create a cloned project with mock data
      const clonedProject = {
        ...project,
        projectId: `proj_${Date.now()}`,
        projectName: `${project.projectName} - Clone`,
        status: 'Planning',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
        cutoverDate: new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 months from now
        discoveryPhase: 'Initial'
      };
      setProjects(prev => [clonedProject, ...prev]);
      console.log('Project cloned successfully:', clonedProject.projectName);
    } catch (error) {
      console.error('Error cloning project:', error);
    }
  };

  const handleUploadFile = () => {
    setUploadDialogOpen(true);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }

    setLoading(true);
    try {
      const [projectsData, applicationsData, contactsData, issuesData, questionsData] = await Promise.all([
        ProjectDiscoveryAPI.searchProjects(query),
        ProjectDiscoveryAPI.searchApplications(query),
        ProjectDiscoveryAPI.searchContacts(query),
        ProjectDiscoveryAPI.searchIssues(query),
        ProjectDiscoveryAPI.searchDiscoveryQuestions(query)
      ]);

      setProjects(projectsData);
      setApplications(applicationsData);
      setContacts(contactsData);
      setIssues(issuesData);
      setDiscoveryQuestions(questionsData);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiscoveryForm = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Discovery Questions
      </Typography>
      {discoverySections.map((section) => (
        <Accordion key={section.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <section.icon sx={{ mr: 2 }} />
              <Typography variant="h6">{section.title}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {section.questions.map((question) => (
                <Grid item xs={12} md={6} key={question.id}>
                  {question.type === 'text' && (
                    <TextField
                      fullWidth
                      label={question.question}
                      value={question.answer}
                      onChange={(e) => handleQuestionChange(section.id, question.id, e.target.value)}
                    />
                  )}
                  {question.type === 'select' && (
                    <FormControl fullWidth>
                      <InputLabel>{question.question}</InputLabel>
                      <Select
                        value={question.answer}
                        onChange={(e) => handleQuestionChange(section.id, question.id, e.target.value)}
                      >
                        {question.options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {question.type === 'textarea' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label={question.question}
                      value={question.answer}
                      onChange={(e) => handleQuestionChange(section.id, question.id, e.target.value)}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pass': return 'success';
      case 'Fail': return 'error';
      case 'In Progress': return 'warning';
      case 'Planning': return 'info';
      case 'Closed': return 'default';
      case 'Not Tested': return 'default';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 0: return 'error';
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pass': return <CheckCircleIcon color="success" />;
      case 'Fail': return <CancelIcon color="error" />;
      case 'In Progress': return <WarningIcon color="warning" />;
      case 'Planning': return <WarningIcon color="info" />;
      default: return <WarningIcon color="disabled" />;
    }
  };

  const filteredApplications = () => {
    let filtered = applications;
    
    if (searchQuery) {
      filtered = filtered.filter(app => 
        JSON.stringify(app).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.nonProdDryRun1Status === filterStatus);
    }

    if (filterCriticality !== 'all') {
      filtered = filtered.filter(app => app.criticality === parseInt(filterCriticality));
    }

    return filtered;
  };

  const renderApplicationsGrid = () => {
    const filteredApps = filteredApplications();
    const paginatedApps = filteredApps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">3rd Party Applications</Typography>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Tested">Not Tested</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Criticality</InputLabel>
              <Select
                value={filterCriticality}
                label="Criticality"
                onChange={(e) => setFilterCriticality(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="3">3</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {/* Add application */}}
            >
              Add Application
            </Button>
          </Box>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Application</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Criticality</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Testing Method</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedApps.map((app) => (
                <TableRow key={app.applicationId}>
                  <TableCell>
                    <Typography variant="subtitle2">{app.applicationName}</Typography>
                  </TableCell>
                  <TableCell>{app.vendor}</TableCell>
                  <TableCell>
                    <Chip 
                      label={app.criticality} 
                      color={getCriticalityColor(app.criticality)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(app.nonProdDryRun1Status)}
                      <Chip 
                        label={app.nonProdDryRun1Status} 
                        color={getStatusColor(app.nonProdDryRun1Status)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{app.manager}</TableCell>
                  <TableCell>{app.team}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {app.testingMethod}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => {/* Edit app */}}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => {/* Delete app */}}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredApps.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      </Box>
    );
  };

  const renderRunbooks = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Runbooks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* Add runbook */}}
        >
          Add Runbook
        </Button>
      </Box>
      <Grid container spacing={2}>
        {runbooks.map((runbook) => (
          <Grid item xs={12} md={6} key={runbook.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {runbook.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {runbook.category}
                </Typography>
                <List dense>
                  {runbook.steps.map((step, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={`${index + 1}. ${step}`} />
                    </ListItem>
                  ))}
                </List>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {runbook.lastUpdated}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => {/* Edit runbook */}}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => {/* Delete runbook */}}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const handleQuestionChange = (sectionId, questionId, value) => {
    setDiscoverySections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              questions: section.questions.map(q => 
                q.id === questionId ? { ...q, answer: value } : q
              )
            }
          : section
      )
    );
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <BackButton sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                Project Discovery
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Company Discovery & Onboarding Management
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleUploadFile}
            >
              Upload File
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloneIcon />}
              onClick={() => handleCloneProject(projects[0])}
            >
              Clone Project
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateProject}
            >
              New Project
            </Button>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search projects, applications, runbooks..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      {/* Tabs */}
      <Box mb={3}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Projects" icon={<AssessmentIcon />} />
          <Tab label="Applications" icon={<BuildIcon />} />
          <Tab label="Contacts" icon={<PeopleIcon />} />
          <Tab label="Issues" icon={<BugReportIcon />} />
          <Tab label="Discovery Questions" icon={<QuestionAnswerIcon />} />
        </Tabs>
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Content */}
      {!loading && activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Projects
          </Typography>
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid item xs={12} md={6} key={project.projectId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {project.projectName}
                      </Typography>
                      <Chip
                        label={project.status}
                        color={getStatusColor(project.status)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {project.companyName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      PM: {project.projectManager}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Apps: {project.totalApplications}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Testable: {project.testableApplications}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="success.main">
                          Passed: {project.passedApplications}
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          Failed: {project.failedApplications}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button size="small" startIcon={<EditIcon />}>
                        View
                      </Button>
                      <Button size="small" startIcon={<EditIcon />}>
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<CloneIcon />}
                        onClick={() => handleCloneProject(project)}
                      >
                        Clone
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!loading && activeTab === 1 && renderApplicationsGrid()}
      {!loading && activeTab === 2 && renderRunbooks()}
      {!loading && activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Issues
          </Typography>
          <List>
            {issues.map((issue) => (
              <ListItem key={issue.issueId} divider>
                <ListItemText
                  primary={`Issue #${issue.issueNumber}: ${issue.issueDescription}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Raised by: {issue.raisedBy} | Date: {issue.dateRaised}
                      </Typography>
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip 
                    label={issue.issueSeverity} 
                    color={getStatusColor(issue.issueSeverity)}
                    size="small"
                  />
                  <Chip 
                    label={issue.issueStatus} 
                    color={getStatusColor(issue.issueStatus)}
                    size="small"
                  />
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {!loading && activeTab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Discovery Questions
          </Typography>
          <List>
            {discoveryQuestions.map((question) => (
              <ListItem key={question.questionId} divider>
                <ListItemText
                  primary={question.question}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Category: {question.category} | Required: {question.required ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2" color="text.primary">
                        Answer: {question.answer || 'Not answered'}
                      </Typography>
                    </Box>
                  }
                />
                <IconButton size="small">
                  <EditIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Dialogs */}
      <Dialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Typography>Project creation form would go here...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Clone Project</DialogTitle>
        <DialogContent>
          <Typography>Clone project "{selectedProject?.name}" to create a new project...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Clone</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Typography>Upload Excel/CSV file to generate project information...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Simple Project Form */}
      <SimpleProjectForm
        open={simpleFormOpen}
        onClose={() => setSimpleFormOpen(false)}
        onSuccess={(newProject) => {
          console.log('Project created successfully:', newProject);
          loadData(); // Refresh the list
        }}
      />
    </Box>
  );
};

export default ProjectDiscovery;
