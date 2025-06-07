import {createTheme, ThemeOptions} from '@mui/material/styles';
const isDevMode = (import.meta.env.MODE === 'development');
const normalTheme = {
  palette: {
    mode: 'light',
    primary: {
      main: '#6696bf',
      light: 'rgba(46,117,182,0.84)',
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


export const themeOptions: ThemeOptions = createTheme(isDevMode? devTheme : normalTheme)