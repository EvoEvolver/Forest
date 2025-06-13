import * as Y from "yjs";
import {Map as YMap} from "yjs";
import {atom, PrimitiveAtom} from "jotai";
import {WebsocketProvider} from "y-websocket";
import {treeId, wsUrl} from "../appState";
import {
    addNodeToNodeDictAtom,
    deleteNodeFromNodeDictAtom,
    scrollToNodeAtom,
    selectedNodeAtom,
    setTreeMetadataAtom
} from "./TreeState";
import {updateChildrenCountAtom} from "./childrenCount";

export const YjsProviderAtom: PrimitiveAtom<WebsocketProvider> = atom();
export const YDocAtom = atom(new Y.Doc());
export const YjsConnectionStatusAtom = atom("connecting");

export const setupYDocAtom = atom(null, (get, set) => {
    const ydoc = get(YDocAtom);
    let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
    set(YjsProviderAtom, wsProvider)
    wsProvider.on('status', event => {
        if (event.status === 'connected') {
            set(YjsConnectionStatusAtom, "connected");
        } else if (event.status === 'disconnected') {
            set(YjsConnectionStatusAtom, "disconnected");
        } else if (event.status === 'connecting') {
            set(YjsConnectionStatusAtom, "connecting");
        }
        console.log('Yjs connection status:', event.status);
    })
    wsProvider.on('sync', isSynced => {
        if (isSynced) {
            const treeMetadata = ydoc.getMap("metadata").toJSON()
            console.log('Yjs sync completed', treeMetadata)
            // Set up the metadata map
            //setTreeMetadata(treeMetadata)
            set(setTreeMetadataAtom, treeMetadata);
            set(YjsConnectionStatusAtom, "connected");
            set(updateChildrenCountAtom, {});
        }
    })
    let nodeDictyMap: YMap<YMap<any>> = ydoc.getMap("nodeDict")
    nodeDictyMap.observe((ymapEvent) => {
        ymapEvent.changes.keys.forEach((change, key) => {
            if (change.action === 'add') {
                let newNode = nodeDictyMap.get(key)
                set(addNodeToNodeDictAtom, newNode)
            } else if (change.action === 'update') {
                let newNode = nodeDictyMap.get(key)
                set(deleteNodeFromNodeDictAtom, key)
                set(addNodeToNodeDictAtom, newNode)
            } else if (change.action === 'delete') {
                set(deleteNodeFromNodeDictAtom, key)
            }
        })
    })
})

export const initSelectedNodeAtom = atom(null, (get, set) => {
    const ydoc = get(YDocAtom);
    let nodeId = new URLSearchParams(window.location.search).get("n");
    const nodeDict = ydoc.getMap("nodeDict") as YMap<any>;
    if (!nodeId && treeId) nodeId = localStorage.getItem(`${treeId}_selectedNodeId`) || null;
    if (!nodeId) nodeId = ydoc.getMap("metadata").get("rootId") || null;
    if (!nodeId) return;
    // observe the nodeDict for changes
    const observer = (ymapEvent) => {
        if (ymapEvent.keys.has(nodeId)) {
            set(selectedNodeAtom, nodeId);
            setTimeout(() => {
                set(scrollToNodeAtom, nodeId)
            }, 500);
            // unobserve the nodeDict after setting the selected node
            nodeDict.unobserve(observer);
        }
    }
    nodeDict.observe(observer)
    // unobserve the nodeDict after 10 seconds
    setTimeout(() => {
        try {
            nodeDict.unobserve(observer);
        } catch {}
    }, 10000);
})