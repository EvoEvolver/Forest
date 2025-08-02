import { createTheme, ThemeOptions } from '@mui/material/styles';

import { atom } from 'jotai';



const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#4e89c0',
      light: '#6696bf',
    },
    secondary: {
      main: '#ff9e80',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
};

const darkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#6ba3d0',
      light: '#8db4d8',
    },
    secondary: {
      main: '#ffb399',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
};

const devTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#4e89c0',
      light: '#6696bf',
    },
    secondary: {
      main: '#ff9e80',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
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