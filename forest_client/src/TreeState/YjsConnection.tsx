import {atom} from "jotai/index";
import * as Y from "yjs";

export const YjsProviderAtom = atom();
export const YDocAtom = atom(new Y.Doc());