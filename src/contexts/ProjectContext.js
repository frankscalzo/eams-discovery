import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children, projectId }) => {
  const [currentProject, setCurrentProject] = useState({
    id: projectId || 'demo-project',
    name: 'Demo Project',
    description: 'A demonstration project for EAMS',
    budget: 100000
  });
  const [userRole, setUserRole] = useState('admin');
  const [isAdmin, setIsAdmin] = useState(true);

  const switchProject = (project) => {
    setCurrentProject(project);
  };

  const value = {
    currentProject,
    userRole,
    isAdmin,
    switchProject
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};