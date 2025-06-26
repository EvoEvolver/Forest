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

export const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
export const wsUrl = `${wsProtocol}://${location.hostname}:${currentPort}`
export const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`
export const treeId = new URLSearchParams(window.location.search).get("id");