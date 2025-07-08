import {atom} from "jotai";


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

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
export const wsUrl = `${wsProtocol}://${location.hostname}:${window.location.port}`
export const treeId = new URLSearchParams(window.location.search).get("id");