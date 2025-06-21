import {atom} from 'jotai';

// An atom family to hold the state of each node (e.g., collapsed or expanded)
const nodeStates = atom<{ [key: string]: { isCollapsed: boolean } }>({});

export const nodeStateAtom = (nodeId: string) =>
    atom(
        (get) => get(nodeStates)[nodeId] || {isCollapsed: true}, // Default to collapsed
        (get, set, newState: { isCollapsed: boolean } | ((prev: { isCollapsed: boolean }) => {
            isCollapsed: boolean
        })) => {
            const currentStates = get(nodeStates);
            const currentState = currentStates[nodeId] || {isCollapsed: true};
            const nextState = typeof newState === 'function' ? newState(currentState) : newState;
            set(nodeStates, {...currentStates, [nodeId]: nextState});
        }
    );