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
            treeMetadata["treeId"] = treeId;
            console.log('Yjs sync completed', treeMetadata)
            // Set up the metadata map
            //setTreeMetadata(treeMetadata)
            set(setTreeMetadataAtom, treeMetadata);
            set(YjsConnectionStatusAtom, "connected");
            set(updateChildrenCountAtom, {});
            const nodeDict = ydoc.getMap("nodeDict") as YMap<any>;
            let rootId = treeMetadata["rootId"];
            // fix for missing rootId
            if (!rootId || !nodeDict.has(rootId)) {
                console.warn("No rootId found in metadata or nodeDict. Searching for rootId.");
                for (let node of nodeDict.values()) {
                    if (node.get("parent") === null) {
                        const newRootId = node.get("id");
                        ydoc.getMap("metadata").set("rootId", newRootId);
                        rootId = newRootId
                        treeMetadata["rootId"] = newRootId;
                        set(setTreeMetadataAtom, treeMetadata);
                    }
                }
            }
            set(initSelectedNodeAtom)
            if (rootId) {
                const rootNode = nodeDict.get(rootId);
                const rootName = rootNode ? rootNode.get("title") : "Tree";
                setWindowTitle(rootName)
            }
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

function setWindowTitle(title: string) {
    document.title = title;
}

export const initSelectedNodeAtom = atom(null, (get, set) => {
    const ydoc = get(YDocAtom);
    /*
    Priority for selected node:
    1. URL parameter "n"
    2. Local storage for selected node
    3. Root node from metadata
     */
    let nodeId = new URLSearchParams(window.location.search).get("n");
    if (nodeId) {
        // remove the nodeId from the URL to prevent it from being used again
        const url = new URL(window.location.href);
        url.searchParams.delete("n");
        window.history.replaceState({}, document.title, url.toString());
    }
    // Earlier registration of observer
    const nodeDict = ydoc.getMap("nodeDict") as YMap<any>;
    if (!nodeId) nodeId = localStorage.getItem(`${treeId}_selectedNodeId`) || null;
    if (!nodeId) nodeId = ydoc.getMap("metadata").get("rootId") || null;
    if (!nodeId) return;

    set(selectedNodeAtom, nodeId);
    setTimeout(() => {
        set(scrollToNodeAtom, nodeId)
    }, 500);

    // observe the nodeDict for changes
    // Todo - investigate why this is not working as expected
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
            //nodeDict.unobserve(observer);
        } catch {
        }
    }, 10000);
})