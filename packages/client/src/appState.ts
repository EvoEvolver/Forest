import {atom} from "jotai";

export const currentPageAtom = atom('tree');

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

export const treeId = typeof window !== undefined ? new URLSearchParams(window.location.search).get("id") : undefined
export const userStudy = typeof window !== undefined ? new URLSearchParams(window.location.search).get("userStudy") : undefined