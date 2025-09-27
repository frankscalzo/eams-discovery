import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

type Variant = 'solid' | 'ghost' | 'soft' | 'danger' | 'outline' | 'default';

type ButtonProps = MuiButtonProps & { 
  variant?: Variant;
  children: React.ReactNode;
};

const variantMap: Record<Variant, MuiButtonProps['variant']> = {
  solid: 'contained',
  ghost: 'text',
  soft: 'contained',
  danger: 'contained',
  outline: 'outlined',
  default: 'contained',
};

const colorMap: Record<Variant, MuiButtonProps['color']> = {
  solid: 'primary',
  ghost: 'inherit',
  soft: 'primary',
  danger: 'error',
  outline: 'inherit',
  default: 'inherit',
};

export default function Button({ 
  variant = 'solid', 
  children,
  sx = {},
  ...props 
}: ButtonProps) {
  const muiVariant = variantMap[variant];
  const muiColor = colorMap[variant];

  const variantStyles = {
    solid: {
      backgroundColor: '#4f46e5',
      '&:hover': {
        backgroundColor: '#4338ca',
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'inherit',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    soft: {
      backgroundColor: 'rgba(79, 70, 229, 0.15)',
      color: '#a5b4fc',
      '&:hover': {
        backgroundColor: 'rgba(79, 70, 229, 0.25)',
      },
    },
    danger: {
      backgroundColor: '#dc2626',
      '&:hover': {
        backgroundColor: '#b91c1c',
      },
    },
    outline: {
      borderColor: '#d1d5db',
      color: '#374151',
      '&:hover': {
        backgroundColor: '#f9fafb',
      },
    },
    default: {
      backgroundColor: '#4b5563',
      '&:hover': {
        backgroundColor: '#374151',
      },
    },
  };

  return (
    <MuiButton
      variant={muiVariant}
      color={muiColor}
      sx={{
        ...variantStyles[variant],
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
}
