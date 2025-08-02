import { createTheme, ThemeOptions } from '@mui/material/styles';

import { atom } from 'jotai';



const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#0288d1',
      light: '#4e89c0',
    },
    secondary: {
      main: '#ff9e80',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    info: {
      main: '#0288d1'
    },
    success: {
      main: '#4caf50'
    }
  },
};

const darkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#0288d1',
    },
    secondary: {
      main: '#7b1fa2',
    },
    background: {
      default: '#1b1b1b',
      paper: '#232323',
    },
    info: {
      main: '#0288d1'
    },
    success: {
      main: '#4caf50'
    }
  },
};

const devTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#0288d1',
      light: '#4e89c0',
    },
    secondary: {
      main: '#ff9e80',
    },
    background: {
      default: '#f6f6f6',
      paper: '#ffffff',
    },
    info: {
      main: '#0288d1'
    },
    success: {
      main: '#4caf50'
    }
  },
}

// Create theme function that accepts mode
export const createAppTheme = (mode: 'light' | 'dark', isDev: boolean = false) => {
  if (isDev && mode === 'light') {
    return createTheme(devTheme);
  }
  return createTheme(mode === 'light' ? lightTheme : darkTheme);
};

// Get theme mode from localStorage or system preference
export const getThemeMode = (): 'light' | 'dark' => {
  const savedMode = localStorage.getItem('userThemePreference');
  if (savedMode === 'light' || savedMode === 'dark') {
    return savedMode;
  }
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

export const themeModeAtom = atom<'light' | 'dark'>(getThemeMode());