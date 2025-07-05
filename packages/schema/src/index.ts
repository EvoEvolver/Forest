import React from 'react';
import * as Y from 'yjs'
import {Doc as YDoc, Map as YMap} from 'yjs'
import {PrimitiveAtom} from "jotai";
import {atom} from "jotai/index";
import {getYjsBindedAtom, nodeMToNodeVMAtom} from "./node";

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
    other_parents: string[]
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

    constructor(ydoc: YDoc, treeId: string) {
        this.ydoc = ydoc
        this.metadata = this.ydoc.getMap("metadata")
        this.nodeDict = this.ydoc.getMap("nodeDict")
        this.metadata.set("treeId", treeId)
    }
    
    static newTree(){
        const ydoc = new Y.Doc()
        return new TreeM(ydoc, null)
    }

    patchFromTreeJson(treeJson: TreeJson) {
        this.ydoc.transact(() => {
            // Update metadata
            const metadata = treeJson.metadata;
            Object.entries(metadata).forEach(([key, value]) => {
                this.metadata.set(key, value);
            });

            // Update nodeDict
            const nodeDictJson = treeJson.nodeDict;
            Object.entries(nodeDictJson).forEach(([key, nodeJson]) => {
                const nodeM = NodeM.fromNodeJson(nodeJson);
                this.addNode(nodeM)
            });
        })
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
    reRenderFlag = atom(false)

    didSelectedNodeInit = false

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
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key)
                    this.addNode(newNode)
                } else if (change.action === 'update') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key)
                    this.deleteNode(key)
                    this.addNode(newNode)
                } else if (change.action === 'delete') {
                    this.deleteNode(key)
                }
            })
        })
        let metadataMap: YMap<any> = treeM.metadata;
        // Initialize atom with current metadata
        this.metadata = atom({
            rootId: metadataMap.get("rootId") || "",
            treeId: metadataMap.get("treeId"),
        });
        this.metadata.onMount = (set) => {
            const observer = (event) => {
                const newMetadata = {
                    rootId: metadataMap.get("rootId") || "",
                    treeId: metadataMap.get("treeId"),
                }
                console.log(newMetadata)
                set(newMetadata);
            }
            metadataMap.observeDeep(observer);
            return () => {
                metadataMap.unobserve(observer);
            }
        }
    }

    addNode(newNode: NodeM) {
        this.nodeDict[newNode.id] = nodeMToNodeVMAtom(newNode, this.supportedNodesTypes)
        this.set(this.reRenderFlag, !this.get(this.reRenderFlag))
    }

    deleteNode(nodeId: string) {
        delete this.nodeDict[nodeId];
        this.set(this.reRenderFlag, !this.get(this.reRenderFlag))
    }

    initSelectedNode() {

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

        ymap.set("other_parents", nodeJson.other_parents);

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

    other_parents(): string[] {
        return this.ymap.get("other_parents");
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
    other_parents: string[]
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

    constructor(nodeM: NodeM, supportedNodesTypes: SupportedNodeTypesMap) {
        const yjsMapNode = nodeM.ymap;
        const childrenAtom = getYjsBindedAtom(yjsMapNode, "children");
        const titleAtom = atom(nodeM.title());
        this.id = nodeM.id
        this.title = titleAtom;
        this.parent = nodeM.parent()
        this.other_parents = nodeM.other_parents()
        this.children = childrenAtom;
        this.data = nodeM.data()
        this.ydata = nodeM.ydata()
        this.vdata = {}

        this.nodeTypeName = nodeM.nodeTypeName()
        this.nodeType = null; // TODO: init the nodeType
        this.nodeM = nodeM

        if (yjsMapNode.has("tabs"))
            this.tabs = yjsMapNode.get("tabs")
        if (yjsMapNode.has("tools"))
            this.tools = yjsMapNode.get("tools")

        this.assignNodeType(supportedNodesTypes)

    }

    assignNodeType(supportedNodesTypes: SupportedNodeTypesMap) {
        if (!this.nodeTypeName) {
            if (this.tabs["content"] === `<PaperEditorMain/>`) {
                this.nodeTypeName = "EditorNodeType"
            } else {
                this.nodeTypeName = "CustomNodeType"
            }
        }
        const nodeType = supportedNodesTypes[this.nodeTypeName]
        if (!nodeType) {
            console.warn("unsupported node type", this.nodeTypeName)
            return
        }
        this.nodeType = nodeType
    }

}

export interface SupportedNodeTypesMap {
    [key: string]: NodeType
}

export abstract class NodeType {
    name: string

    allowAddingChildren: boolean = false

    allowReshape: boolean = false

    allowEditTitle: boolean = false

    abstract render(node: NodeVM): React.ReactNode

    abstract renderTool1(node: NodeVM): React.ReactNode

    abstract renderTool2(node: NodeVM): React.ReactNode

    abstract renderPrompt(node: NodeVM): string

    abstract ydataInitialize(node: NodeVM): void
}