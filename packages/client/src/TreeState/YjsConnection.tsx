import {Map as YMap} from "yjs";
import {atom, PrimitiveAtom} from "jotai";
import {WebsocketProvider} from "@forest/schema/src/y-websocket";
import {treeId, wsUrl} from "../appState";
import {scrollToNodeAtom, selectedNodeAtom, treeAtom} from "./TreeState";
import {updateChildrenCountAtom} from "./childrenCount";
import {TreeM, TreeVM} from "@forest/schema";
import {supportedNodeTypes} from "@forest/node-types"

export const YjsProviderAtom: PrimitiveAtom<WebsocketProvider> = atom();
export const YjsConnectionStatusAtom = atom("connecting");

export const setupYDocAtom = atom(null, async (get, set) => {
    const [treeM, wsProvider] = await TreeM.treeFromWs(wsUrl, treeId)
    treeM.supportedNodesTypes = supportedNodeTypes
    set(treeAtom, treeM)
    const currTree = get(treeAtom)
    set(YjsProviderAtom, wsProvider)
    const ydoc = treeM.ydoc
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
            get(treeAtom).syncMetadata(set)
            // Set up the metadata map
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
                        set(currTree.metadata, treeMetadata);
                    }
                }
            }
            set(initSelectedNodeAtom)
            if (rootId) {
                const rootNode = nodeDict.get(rootId);
                const rootName = rootNode ? (rootNode.get("title") || "Treer") : "Treer";
                setWindowTitle(rootName)
            }
        }
    })
})

function setWindowTitle(title: string) {
    document.title = title;
}

export const initSelectedNodeAtom = atom(null, (get, set) => {
    const treeVM: TreeVM = get(treeAtom);
    /*
    Priority for the selected node:
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
    const rootId = treeVM.treeM.metadata.get("rootId")
    // Earlier registration of observer
    if (!nodeId) nodeId = localStorage.getItem(`${treeId}_selectedNodeId`) || null;
    if (!nodeId) nodeId = rootId || null;
    if (!nodeId) return;

    console.log("Init selected node", nodeId)
    set(selectedNodeAtom, nodeId);
    setTimeout(() => {
        set(selectedNodeAtom, nodeId);
        set(scrollToNodeAtom, nodeId)
    }, 500);

    // observe the nodeDict for changes
    // Todo - investigate why this is not working as expected
    const nodeDict = treeVM.treeM.nodeDict
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
    //unobserve the nodeDict after 10 seconds
    setTimeout(() => {
        try {
            set(selectedNodeAtom, nodeId);
            setTimeout(() => {
                set(scrollToNodeAtom, nodeId)
            }, 500);
        } catch {
        }
    }, 1000);
})