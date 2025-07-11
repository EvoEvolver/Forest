import {createTheme, ThemeOptions} from '@mui/material/styles';
const isDevMode = (import.meta.env.MODE === 'development');
const normalTheme = {
  palette: {
    mode: 'light',
    primary: {
      main: '#4e89c0',
      light: '#6696bf',
    },
    secondary: {
      main: '#ff9e80',
    },
  },
}

const devTheme = {
    palette: {
        mode: 'light',
        primary: {
        main: '#f15959',
        light: 'rgba(241,125,125,0.84)',
        },
        secondary: {
        main: '#ffc107',
        },
    },
}


// @ts-ignore
export const themeOptions: ThemeOptions = createTheme(normalTheme)