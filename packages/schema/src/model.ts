import * as Y from 'yjs'
import {Doc as YDoc, Map as YMap} from 'yjs'
import {WebsocketProvider} from "y-websocket";

export interface NodeJson {
    id: string,
    title: string,
    parent: string,
    children: string[],
    data: any,
    nodeTypeName: string,
    tabs?: any,
    tools?: any
}

export interface TreeJson {
    metadata: TreeMetadata,
    nodeDict: { [key: string]: NodeJson }
}

export interface TreeMetadata {
    rootId: string,
    treeId?: string,
}

/*
The data type shared between backend and frontend
 */
export class TreeM {
    ydoc: YDoc
    nodeDict: YMap<YMap<any>>
    metadata: YMap<any>

    constructor(ydoc: YDoc) {
        this.ydoc = ydoc
        this.metadata = this.ydoc.getMap("metadata")
        this.nodeDict = this.ydoc.getMap("nodeDict")
    }

    static treeFromWs(wsUrl: string, treeId: string): [TreeM, WebsocketProvider] {
        const ydoc = new Y.Doc()
        const treeM = new TreeM(ydoc)
        let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
        return [treeM, wsProvider]
    }

    static treeFromWsWait(wsUrl: string, treeId: string): Promise<TreeM> {
        return new Promise((resolve) => {
            const ydoc = new Y.Doc()
            const treeM = new TreeM(ydoc)
            const wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
            wsProvider.on('sync', (isSynced: boolean) => {
                if (isSynced) {
                    resolve(treeM)
                }
            })
        })
    }

    patchFromTreeJson(treeJson: TreeJson, treeId: string) {
        this.ydoc.transact(() => {
            // Update metadata
            const metadata = treeJson.metadata;
            console.log(metadata)
            Object.entries(metadata).forEach(([key, value]) => {
                this.metadata.set(key, value);
            });
            if (treeId) {
                this.metadata.set("treeId", treeId);
            }

            // Update nodeDict
            const nodeDictJson = treeJson.nodeDict;
            Object.entries(nodeDictJson).forEach(([key, nodeJson]) => {
                const nodeM = NodeM.fromNodeJson(nodeJson);
                this.addNode(nodeM)
            });
        })
    }

    getChildren(nodeM: NodeM): NodeM[] {
        const childrenArray = nodeM.children()
        const childrenIds = childrenArray.toJSON()
        const childrenNodes: NodeM[] = []
        childrenIds.forEach((childId) => {
            const childNode = this.getNode(childId)
            if (childNode) {
                childrenNodes.push(childNode)
            }
        })
        return childrenNodes
    }

    getNode(nodeId: string): NodeM | undefined {
        const nodeYMap = this.nodeDict.get(nodeId)
        if (!nodeYMap) return undefined
        return new NodeM(nodeYMap, nodeId)
    }

    getRoot(): NodeM | undefined {
        const rootId = this.metadata.get("rootId")
        if (!rootId) return undefined
        return this.getNode(rootId)
    }

    id(): string {
        return this.metadata.get("treeId")
    }

    addNode(node: NodeM) {
        this.nodeDict.set(node.id, node.ymap)
    }

    insertNode(node: NodeM, parentId: string, positionId: string) {
        this.ydoc.transact(() => {
            this.addNode(node)
            const parentChildrenArray = this.nodeDict.get(parentId).get("children")
            const childrenJson = parentChildrenArray.toJSON()
            // find the position of the node with positionId in parentChildrenArray
            let positionIdx = -1
            if (positionId) {
                positionIdx = childrenJson.indexOf(positionId) + 1
                if (positionIdx === -1) {
                    console.warn(`Position ID ${positionId} not found in parent with id ${parentId}`)
                    positionIdx = parentChildrenArray.length // append to the end
                }
            } else {
                positionIdx = parentChildrenArray.length // append to the end
            }
            parentChildrenArray.insert(positionIdx, [node.id])
        })
    }

    deleteNode(nodeId: string) {
        this.nodeDict.delete(nodeId)
    }
}


/*
The data type shared between backend and frontend
 */
export class NodeM {
    ymap: YMap<any>;
    id: string

    static fromNodeJson(nodeJson: NodeJson): NodeM {
        const ymap = new YMap<any>();
        ymap.set("id", nodeJson.id);
        ymap.set("title", nodeJson.title);
        ymap.set("parent", nodeJson.parent);

        // Convert arrays to Y.Array
        const childrenArray = new Y.Array<string>();
        childrenArray.insert(0, nodeJson.children);
        ymap.set("children", childrenArray);

        ymap.set("data", nodeJson.data);
        ymap.set("nodeTypeName", nodeJson.nodeTypeName);

        // Optionally, initialize ydata as empty Y.Map
        ymap.set("ydata", new YMap<any>());

        ymap.set("tabs", nodeJson.tabs)
        ymap.set("tools", nodeJson.tools)

        return new NodeM(ymap, nodeJson.id)
    }

    constructor(ymap: YMap<any>, nodeId: string) {
        this.id = nodeId
        this.ymap = ymap
    }

    title(): string {
        return this.ymap.get("title");
    }

    parent(): string {
        return this.ymap.get("parent");
    }

    children(): Y.Array<string> {
        return this.ymap.get("children");
    }

    data(): any {
        return this.ymap.get("data");
    }

    ydata(): Y.Map<any> | undefined {
        return this.ymap.get("ydata");
    }

    nodeTypeName(): string {
        return this.ymap.get("nodeTypeName");
    }
}
