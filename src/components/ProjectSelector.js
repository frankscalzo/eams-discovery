import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ProjectSelector = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Project Selector
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Project selection functionality will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectSelector;