import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  CognitoIdentityProviderClient, 
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import enhancedUserAPI from '../services/enhancedUserAPI';

const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1' 
});

const EnhancedPasswordReset = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
    resetMethod: 'email' // 'email' or 'admin'
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const steps = [
    'Enter Email',
    'Verify Identity',
    'Set New Password',
    'Complete'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    };
  };

  const handleStep1 = async () => {
    if (!formData.email || !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if user exists
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: formData.email
      });

      try {
        const userResult = await cognitoClient.send(getUserCommand);
        setUserInfo(userResult);
        
        if (formData.resetMethod === 'email') {
          // Initiate password reset via email
          const forgotPasswordCommand = new ForgotPasswordCommand({
            ClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
            Username: formData.email
          });

          await cognitoClient.send(forgotPasswordCommand);
          setSuccess('Password reset code sent to your email address');
          setActiveStep(1);
        } else {
          // Admin reset - go directly to password setting
          setActiveStep(2);
        }
      } catch (error) {
        if (error.name === 'UserNotFoundException') {
          setError('No account found with this email address');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error initiating password reset:', error);
      setError('Failed to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!formData.verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Verify the code and set new password
      const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
        ClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
        Username: formData.email,
        ConfirmationCode: formData.verificationCode,
        Password: formData.newPassword
      });

      await cognitoClient.send(confirmForgotPasswordCommand);
      setSuccess('Password reset successfully! You can now log in with your new password.');
      setActiveStep(3);
    } catch (error) {
      console.error('Error confirming password reset:', error);
      if (error.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please check your email and try again.');
      } else if (error.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    const passwordValidation = validatePassword(formData.newPassword);
    
    if (!passwordValidation.isValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (formData.resetMethod === 'admin') {
        // Admin reset - set password directly
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: formData.email,
          Password: formData.newPassword,
          Permanent: true
        });

        await cognitoClient.send(setPasswordCommand);
        setSuccess('Password reset successfully! User can now log in with the new password.');
      } else {
        // Email reset - this should have been handled in step 2
        setSuccess('Password reset successfully! You can now log in with your new password.');
      }
      
      setActiveStep(3);
    } catch (error) {
      console.error('Error setting password:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    switch (activeStep) {
      case 0:
        handleStep1();
        break;
      case 1:
        handleStep2();
        break;
      case 2:
        handleStep3();
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
    setSuccess('');
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Enter Email Address
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Enter the email address associated with your account to reset your password.
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
            error={!!error && !formData.email}
            helperText={error && !formData.email ? error : ''}
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Reset Method</InputLabel>
            <Select
              value={formData.resetMethod}
              onChange={(e) => handleInputChange('resetMethod', e.target.value)}
              label="Reset Method"
            >
              <MenuItem value="email">Send reset code via email</MenuItem>
              <MenuItem value="admin">Admin reset (immediate)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Verify Identity
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        We've sent a verification code to <strong>{formData.email}</strong>. 
        Please check your email and enter the code below.
      </Typography>
      
      <TextField
        fullWidth
        label="Verification Code"
        value={formData.verificationCode}
        onChange={(e) => handleInputChange('verificationCode', e.target.value)}
        placeholder="Enter 6-digit code"
        error={!!error}
        helperText={error || 'Check your email for the verification code'}
        sx={{ mb: 2 }}
      />
      
      <Typography variant="body2" color="text.secondary">
        Didn't receive the code? Check your spam folder or{' '}
        <Button 
          variant="text" 
          size="small" 
          onClick={handleStep1}
          disabled={loading}
        >
          resend code
        </Button>
      </Typography>
    </Box>
  );

  const renderStep3 = () => {
    const passwordValidation = validatePassword(formData.newPassword);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Set New Password
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create a strong password for your account.
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              error={!!error && formData.newPassword && !passwordValidation.isValid}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              error={!!error && formData.confirmPassword && formData.newPassword !== formData.confirmPassword}
            />
          </Grid>
        </Grid>
        
        {/* Password requirements */}
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Password Requirements:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Box component="li" color={passwordValidation.minLength ? 'success.main' : 'text.secondary'}>
              At least 8 characters
            </Box>
            <Box component="li" color={passwordValidation.hasUpperCase ? 'success.main' : 'text.secondary'}>
              At least one uppercase letter
            </Box>
            <Box component="li" color={passwordValidation.hasLowerCase ? 'success.main' : 'text.secondary'}>
              At least one lowercase letter
            </Box>
            <Box component="li" color={passwordValidation.hasNumbers ? 'success.main' : 'text.secondary'}>
              At least one number
            </Box>
            <Box component="li" color={passwordValidation.hasSpecialChar ? 'success.main' : 'text.secondary'}>
              At least one special character
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderStep4 = () => (
    <Box textAlign="center">
      <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Password Reset Complete!
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {success}
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/login')}
        sx={{ mt: 2 }}
      >
        Go to Login
      </Button>
    </Box>
  );

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={() => navigate('/login')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Reset Password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          {activeStep < 3 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0 || loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                endIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Processing...' : activeStep === 2 ? 'Reset Password' : 'Next'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnhancedPasswordReset;

