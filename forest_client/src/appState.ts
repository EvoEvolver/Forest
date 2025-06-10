import {atom} from "jotai";

export const darkModeAtom = atom(false)

export const isDevMode = (import.meta.env.MODE === 'development');

export const isMobileModeAtom = atom(false)

isMobileModeAtom.onMount = (set) => {
    const handleResize = () => {
        const isMobile = window.innerWidth < 800
        set(isMobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
    };
}