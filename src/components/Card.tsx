import React from 'react';
import { Card as MuiCard, CardContent, CardHeader, CardActions, Typography, Box } from '@mui/material';

type CardProps = {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'elevation' | 'outlined';
  elevation?: number;
  sx?: any;
};

export default function Card({ 
  title, 
  subtitle, 
  footer, 
  children, 
  className = '',
  variant = 'elevation',
  elevation = 1,
  sx = {}
}: CardProps) {
  return (
    <MuiCard 
      className={className}
      variant={variant}
      elevation={elevation}
      sx={{
        borderRadius: 2,
        ...sx
      }}
    >
      {(title || subtitle) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
          subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
        />
      )}
      <CardContent>
        {children}
      </CardContent>
      {footer && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          {footer}
        </CardActions>
      )}
    </MuiCard>
  );
}
