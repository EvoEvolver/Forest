import React from 'react';
import * as Y from 'yjs'
import {Doc as YDoc, Map as YMap} from 'yjs'
import {PrimitiveAtom} from "jotai";
import {atom} from "jotai/index";
import {getYjsBindedAtom, nodeMToNodeVMAtom} from "./node";
import {WebsocketProvider} from "y-websocket";

export interface TreeJson {
    metadata: TreeMetadata,
    nodeDict: { [key: string]: NodeJson };
}

export interface TreeMetadata {
    rootId: string,
    treeId?: string,
}

export interface NodeJson {
    id: string
    title: string
    parent: string
    children: string[]
    data: any
    nodeTypeName: string
    tabs?: any
    tools?: any
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

    getNode(nodeId: string):NodeM | undefined {
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
The data type hold only by the frontend as ViewModel (VM) for components to consume
 */
export class TreeVM {
    metadata: PrimitiveAtom<TreeMetadata>
    nodeDict: Record<string, PrimitiveAtom<NodeVM>>
    supportedNodesTypes: SupportedNodeTypesMap
    treeM: TreeM
    get: any
    set: any
    viewCommitNumberAtom = atom(0)
    viewCommitNumber: number = 0

    /*
    The constructor links the TreeVM to the TreeM
     */
    constructor(treeM: TreeM, get, set) {
        this.get = get
        this.set = set
        this.treeM = treeM
        this.nodeDict = {}
        let nodeDictyMap: YMap<YMap<any>> = treeM.nodeDict
        nodeDictyMap.observe((ymapEvent) => {
            let promises: Promise<void>[] = [];
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key);
                    promises.push(this.addNode(newNode));
                } else if (change.action === 'update') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key);
                    this.deleteNode(key);
                    promises.push(this.addNode(newNode));
                } else if (change.action === 'delete') {
                    this.deleteNode(key);
                }
            });
            // Wait for all promises to complete before triggering re-render
            Promise.all(promises).then(() => {
                this.commitViewToRender()
                promises = []; // Reset the promises array
            });
        });
        let metadataMap: YMap<any> = treeM.metadata;
        // Initialize atom with current metadata
        this.metadata = atom({
            rootId: metadataMap.get("rootId") || "",
            treeId: metadataMap.get("treeId"),
        });
        this.metadata.onMount = (set) => {
            const observer = () => {
                this.syncMetadata(set)
            }
            metadataMap.observeDeep(observer);
            return () => {
                metadataMap.unobserveDeep(observer);
            }
        }
    }

    syncMetadata(set) {
        const newMetadata = {
            rootId: this.treeM.metadata.get("rootId") || "",
            treeId: this.treeM.metadata.get("treeId"),
        }
        console.log(newMetadata)
        set(this.metadata, newMetadata);
        this.commitViewToRender()
    }

    async addNode(newNode: NodeM) {
        this.nodeDict[newNode.id] = await nodeMToNodeVMAtom(newNode, this.supportedNodesTypes)
    }

    deleteNode(nodeId: string) {
        delete this.nodeDict[nodeId];
    }

    initSelectedNode() {

    }

    commitViewToRender(){
        this.viewCommitNumber = this.viewCommitNumber + 1
        console.log("commit number: ", this.viewCommitNumber)
        this.set(this.viewCommitNumberAtom, this.viewCommitNumber)
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

/*
The data type hold only by the frontend as ViewModel (VM) for components to consume
 */
export class NodeVM {
    id: string
    title: PrimitiveAtom<string>
    parent: string
    children: PrimitiveAtom<string[]>
    data: any
    ydata?: Y.Map<string>
    vdata: any
    nodeTypeName: string
    nodeType: NodeType
    nodeM: NodeM

    // legacy properties
    tabs: any
    tools: any

    static async create(nodeM, supportedNodesTypes: SupportedNodeTypesMap) {
        const nodeVM = new NodeVM()
        const yjsMapNode = nodeM.ymap;
        const childrenAtom = getYjsBindedAtom(yjsMapNode, "children");
        const titleAtom = atom(nodeM.title());
        nodeVM.id = nodeM.id
        nodeVM.title = titleAtom;
        nodeVM.parent = nodeM.parent()
        nodeVM.children = childrenAtom;
        nodeVM.data = nodeM.data()
        nodeVM.ydata = nodeM.ydata()
        nodeVM.vdata = {}

        nodeVM.nodeTypeName = nodeM.nodeTypeName()
        nodeVM.nodeType = null; // TODO: init the nodeType
        nodeVM.nodeM = nodeM

        if (yjsMapNode.has("tabs"))
            nodeVM.tabs = yjsMapNode.get("tabs")
        if (yjsMapNode.has("tools"))
            nodeVM.tools = yjsMapNode.get("tools")

        await nodeVM.assignNodeType(supportedNodesTypes)
        return nodeVM
    }

    constructor() {
    }

    async assignNodeType(supportedNodesTypes: SupportedNodeTypesMap) {
        if (!this.nodeTypeName) {
            if (this.tabs["content"] === `<PaperEditorMain/>`) {
                this.nodeTypeName = "EditorNodeType"
            } else {
                this.nodeTypeName = "CustomNodeType"
            }
        }
        this.nodeType = await getNodeType(this.nodeTypeName, supportedNodesTypes)
    }

}

export async function getNodeType(nodeTypeName: string, supportedNodesTypes: SupportedNodeTypesMap): Promise<NodeType> {
    return await supportedNodesTypes(nodeTypeName)
}

export type SupportedNodeTypesMap = (typeName: string)=>Promise<NodeType>

export abstract class NodeType {
    name: string

    allowAddingChildren: boolean = false

    allowReshape: boolean = false

    allowEditTitle: boolean = false

    abstract render(node: NodeVM): React.ReactNode

    abstract renderTool1(node: NodeVM): React.ReactNode

    abstract renderTool2(node: NodeVM): React.ReactNode

    abstract renderPrompt(node: NodeM): string

    ydataInitialize(node: NodeVM): void{}
}