import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton, Tooltip, Box } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const BackButton = ({ 
  to = null, 
  onClick = null, 
  tooltip = 'Go Back',
  size = 'medium',
  sx = {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      // Go back to previous page in history
      navigate(-1);
    }
  };

  // Don't show back button on main dashboard or login pages
  const hideOnPages = ['/dashboard', '/login', '/password-reset'];
  if (hideOnPages.includes(location.pathname)) {
    return null;
  }

  return (
    <Box sx={sx}>
      <Tooltip title={tooltip}>
        <IconButton 
          onClick={handleClick}
          size={size}
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'action.hover',
              boxShadow: 2
            },
            ...sx
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default BackButton;

