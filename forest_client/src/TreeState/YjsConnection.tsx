import * as Y from "yjs";
import {Map as YMap} from "yjs";
import {atom, PrimitiveAtom} from "jotai";
import {WebsocketProvider} from "y-websocket";
import {treeId, wsUrl} from "../appState";

export const YjsProviderAtom: PrimitiveAtom<WebsocketProvider> = atom();
export const YDocAtom = atom(new Y.Doc());

export const setupYDoc = (setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree, observeSync) => {
    let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
    setYjsProvider(wsProvider)
    wsProvider.on('status', event => {
        console.log("Server connected!", event)
    })
    wsProvider.on('sync', isSynced => {
        if (isSynced) {
            observeSync()
        }
    })
    let nodeDictyMap: YMap<YMap<any>> = ydoc.getMap("nodeDict")
    nodeDictyMap.observe((ymapEvent) => {
        ymapEvent.changes.keys.forEach((change, key) => {
            if (change.action === 'add') {
                let newNode = nodeDictyMap.get(key)
                addNodeToTree(newNode)
            } else if (change.action === 'update') {
                let newNode = nodeDictyMap.get(key)
                deleteNodeFromTree(key)
                addNodeToTree(newNode)
            } else if (change.action === 'delete') {
                deleteNodeFromTree(key)
            }
        })
    })
}