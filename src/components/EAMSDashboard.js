import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const EAMSDashboard = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        EAMS Dashboard
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Enterprise Architecture Management System dashboard functionality will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EAMSDashboard;
