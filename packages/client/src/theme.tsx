import {createTheme, ThemeOptions} from '@mui/material/styles';

import {atom} from 'jotai';


const lightTheme: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#6894bf',
            light: '#91a9c1',
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
            main: '#638cb3',
        },
        secondary: {
            main: '#7b1fa2',
        },
        background: {
            default: '#1b1b1b',
            paper: '#232323',
        },
        info: {
            main: '#5e86ae'
        },
        success: {
            main: '#4caf50'
        }
    },
};


// Create theme function that accepts mode
export const createAppTheme = (mode: 'light' | 'dark' | 'system', isDev: boolean = false) => {
    const resolvedMode = mode === 'system' ? getSystemPreference() : mode;
    return createTheme(resolvedMode === 'light' ? lightTheme : darkTheme);
};

// Helper function to get system preference
export const getSystemPreference = (): 'light' | 'dark' => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

// Get theme mode from localStorage or system preference
export const getThemeMode = (): 'light' | 'dark' | 'system' => {
    const savedMode = localStorage.getItem('userThemePreference');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        return savedMode as 'light' | 'dark' | 'system';
    }
    // Default to system if no preference is saved
    return 'system';
};

export const themeModeAtom = atom<'light' | 'dark' | 'system'>(getThemeMode());