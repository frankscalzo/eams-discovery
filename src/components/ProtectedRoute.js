import React from 'react';
import { Navigate } from 'react-router-dom';
import { useBffAuth } from '../contexts/BffAuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useBffAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;