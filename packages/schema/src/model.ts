import * as Y from 'yjs'
import {Doc as YDoc, Map as YMap} from 'yjs'
import {WebsocketProvider} from "./y-websocket";
import {v4} from "uuid"
import {NodeTypeM} from "./nodeTypeM.ts";

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

export type SupportedNodeTypesM = (typeName: string) => typeof NodeTypeM

/*
The data type shared between backend and frontend
 */
export class TreeM {
    ydoc: YDoc
    nodeDict: YMap<YMap<any>>
    metadata: YMap<any>
    supportedNodeTypesM: SupportedNodeTypesM

    constructor(ydoc: YDoc, supportedNodeTypesM: SupportedNodeTypesM) {
        this.ydoc = ydoc
        this.metadata = this.ydoc.getMap("metadata")
        this.nodeDict = this.ydoc.getMap("nodeDict")
        this.supportedNodeTypesM = supportedNodeTypesM
    }

    static treeFromWs(wsUrl: string, treeId: string, supportedNodeTypesM: SupportedNodeTypesM): [TreeM, WebsocketProvider] {
        const ydoc = new Y.Doc()
        const treeM = new TreeM(ydoc, supportedNodeTypesM)
        let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
        return [treeM, wsProvider]
    }

    static treeFromWsWait(wsUrl: string, treeId: string, supportedNodeTypesM: SupportedNodeTypesM): Promise<TreeM> {
        return new Promise((resolve) => {
            const ydoc = new Y.Doc()
            const treeM = new TreeM(ydoc, supportedNodeTypesM)
            const wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
            wsProvider.on('sync', (isSynced: boolean) => {
                if (isSynced) {
                    resolve(treeM)
                }
            })
        })
    }

    async patchFromTreeJson(treeJson: TreeJson, treeId: string) {
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
            Object.entries(nodeDictJson).forEach(async ([key, nodeJson]) => {
                const nodeM = NodeM.fromNodeJson(nodeJson, this);
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

    getParent(nodeM: NodeM): NodeM | undefined {
        const parentId = nodeM.parent()
        if (!parentId) return undefined
        return this.getNode(parentId)
    }

    getNode(nodeId: string): NodeM | undefined {
        const nodeYMap = this.nodeDict.get(nodeId)
        if (!nodeYMap) return undefined
        const nodeM = new NodeM(nodeYMap, nodeId, this)
        return nodeM
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

    // Get all descendant nodes of a given node (recursive subtree traversal)
    getAllDescendantNodes(nodeM: NodeM): NodeM[] {
        const descendants: NodeM[] = [];
        const children = this.getChildren(nodeM);
        
        for (const child of children) {
            descendants.push(child);
            // Recursively get descendants of this child
            const childDescendants = this.getAllDescendantNodes(child);
            descendants.push(...childDescendants);
        }
        
        return descendants;
    }
}


/*
The data type shared between backend and frontend
 */
export class NodeM {
    ymap: YMap<any>;
    id: string
    treeM: TreeM
    nodeType: typeof NodeTypeM | undefined

    static fromNodeJson(nodeJson: NodeJson, treeM: TreeM): NodeM {
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

        const newNodeM = new NodeM(ymap, nodeJson.id, treeM)
        const nodeType = treeM.supportedNodeTypesM(nodeJson.nodeTypeName)
        nodeType.ydataInitialize(newNodeM)
        return newNodeM
    }

    constructor(ymap: YMap<any>, nodeId: string, treeM: TreeM) {
        this.id = nodeId
        this.ymap = ymap
        this.treeM = treeM
        this.nodeType = treeM.supportedNodeTypesM(this.nodeTypeName())
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

    getSnapshot(): string {
        const snapdoc = new YDoc()
        const newNodeYmap = snapdoc.getMap("node")
        snapdoc.transact(() => {
            newNodeYmap.set("title", this.title())
            newNodeYmap.set("data", this.data())
            newNodeYmap.set("nodeTypeName", this.nodeTypeName())
            newNodeYmap.set("ydata", this.ydata().clone())
            newNodeYmap.set("children", new Y.Array<string>())
            newNodeYmap.set("parent", "")
        })
        const stateVector = Y.encodeStateAsUpdate(snapdoc)
        // Convert Uint8Array to base64 string
        return btoa(String.fromCharCode(...stateVector))
    }

    static fromSnapshot(stateVector: string): NodeM {
        const snapdoc = new YDoc()
        // Convert base64 string back to Uint8Array
        const binaryString = atob(stateVector)
        const stateVectorArray = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            stateVectorArray[i] = binaryString.charCodeAt(i)
        }
        Y.applyUpdate(snapdoc, stateVectorArray)
        const nodeYmap = snapdoc.getMap("node")
        const tempId = v4()
        nodeYmap.set("id", tempId)
        return new NodeM(nodeYmap, tempId, null)
    }
}
