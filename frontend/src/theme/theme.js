/**
 * Material-UI Theme Configuration
 *
 * Matches existing brand colors from index.css CSS variables
 * Supports light/dark mode toggle
 */

import { createTheme } from '@mui/material/styles';

// Create theme function that accepts mode ('light' or 'dark')
export const createAppTheme = (mode = 'light') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#646cff', // Matches --link-color
        light: '#747bff', // Matches --button-hover
        dark: '#535bf2',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#535bf2',
        light: '#747bff',
        dark: '#4248c7',
        contrastText: '#ffffff',
      },
      error: {
        main: '#dc3545', // Matches --error-text
        light: '#f8d7da', // Matches --error-bg
        dark: '#bd2130',
        contrastText: '#ffffff',
      },
      success: {
        main: '#0f5132', // Matches --success-text
        light: '#d1e7dd', // Matches --success-bg
        dark: '#0a3622',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#856404', // Matches --warning-text
        light: '#fff3cd', // Matches --warning-bg
        dark: '#533f03',
        contrastText: '#ffffff',
      },
      background: {
        default: mode === 'light' ? '#ffffff' : '#1a1a1a',
        paper: mode === 'light' ? '#f9f9f9' : '#242424',
      },
      text: {
        primary: mode === 'light' ? '#000000' : '#ffffff',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
      fontSize: 16,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: {
        fontSize: '3.2rem',
        lineHeight: 1.1,
        fontWeight: 700,
      },
      h2: {
        fontSize: '2.4rem',
        lineHeight: 1.2,
        fontWeight: 600,
      },
      h3: {
        fontSize: '1.8rem',
        lineHeight: 1.3,
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.5rem',
        lineHeight: 1.4,
        fontWeight: 500,
      },
      h5: {
        fontSize: '1.25rem',
        lineHeight: 1.5,
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        lineHeight: 1.5,
        fontWeight: 500,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none', // Disable uppercase transformation
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8, // Matches existing border-radius
    },
    spacing: 8, // Base spacing unit (8px)
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '0.6em 1.2em',
            fontSize: '1em',
            fontWeight: 500,
            transition: 'border-color 0.25s, background-color 0.25s',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: mode === 'light'
              ? '0 2px 4px rgba(0, 0, 0, 0.1)'
              : '0 2px 4px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiSelect: {
        defaultProps: {
          variant: 'outlined',
        },
      },
    },
  });
};

// Default light theme export
export default createAppTheme('light');
