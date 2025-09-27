import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const CostMonitoring = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Cost Monitoring
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Cost monitoring functionality will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CostMonitoring;
