import * as Y from "yjs";
import {atom, PrimitiveAtom} from "jotai";
import {WebsocketProvider} from "y-websocket";

export const YjsProviderAtom: PrimitiveAtom<WebsocketProvider> = atom();
export const YDocAtom = atom(new Y.Doc());