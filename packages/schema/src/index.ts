import React from 'react';
import * as Y from 'yjs'
import {Doc as YDoc, Map as YMap} from 'yjs'
import {PrimitiveAtom} from "jotai";
import {atom} from "jotai/index";
import {getYjsBindedAtom, nodeMToNodeVMAtom} from "./node";

export interface TreeMetaData {
    rootId: string,
    treeId?: string,
}

/*
The data type shared between backend and frontend
 */
export class TreeM {
    ydoc: YDoc

    constructor(ydoc: YDoc) {
        this.ydoc = ydoc
    }

    nodeDict(): YMap<YMap<any>> {
        return this.ydoc.getMap("nodeDict")
    }

    metadata(): YMap<any> {
        // @ts-ignore
        return this.ydoc.getMap("metadata")
    }
}

/*
The data type hold only by the frontend as ViewModel (VM) for components to consume
 */
export class TreeVM {
    metadata: PrimitiveAtom<TreeMetaData>
    nodeDict: Record<string, PrimitiveAtom<NodeVM>>
    supportedNodesTypes: SupportedNodeTypesMap
    treeM: TreeM
    get: any
    set: any
    reRenderFlag = atom(false)
    /*
    The constructor links the TreeVM to the TreeM
     */
    constructor(treeM: TreeM, get, set) {
        this.get = get
        this.set = set
        this.treeM = treeM
        this.nodeDict = {}
        let nodeDictyMap: YMap<YMap<any>> = treeM.nodeDict()
        nodeDictyMap.observe((ymapEvent) => {
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                    let newNode = new NodeM(nodeDictyMap.get(key))
                    this.addNode(newNode)
                    console.log("added")
                } else if (change.action === 'update') {
                    let newNode = new NodeM(nodeDictyMap.get(key))
                    this.deleteNode(key)
                    this.addNode(newNode)
                } else if (change.action === 'delete') {
                    this.deleteNode(key)
                }
            })
        })
        let metadataMap: YMap<any> = treeM.metadata();
        // Initialize atom with current metadata
        this.metadata = atom({
            rootId: metadataMap.get("rootId") || "",
            treeId: metadataMap.get("treeId"),
        });
        this.metadata.onMount = (set) => {
            const observer = (event) => {
                set({
                    rootId: metadataMap.get("rootId") || "",
                    treeId: metadataMap.get("treeId"),
                });
            }
            metadataMap.observe(observer);
            return () => {
                metadataMap.unobserve(observer);
            }
        }
    }

    addNode(newNode: NodeM) {
        this.nodeDict[newNode.id()] = nodeMToNodeVMAtom(newNode, this.supportedNodesTypes)
        this.set(this.reRenderFlag, !this.get(this.reRenderFlag))
    }

    deleteNode(nodeId: string) {
        delete this.nodeDict[nodeId];
        this.set(this.reRenderFlag, !this.get(this.reRenderFlag))
    }

}

/*
The data type shared between backend and frontend
 */
export class NodeM {
    ymap: YMap<any>;

    constructor(ymap: YMap<any>) {
        this.ymap = ymap;
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

    ydata(): Y.Map<string> | undefined {
        return this.ymap.get("ydata");
    }

    nodeTypeName(): string {
        return this.ymap.get("nodeTypeName");
    }

    id(): string {
        return this.ymap.get("id");
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
    nodeTypeName: string
    nodeType: NodeType
    nodeM: NodeM

    tabs: any
    tools: any

    constructor(nodeM: NodeM, supportedNodesTypes: SupportedNodeTypesMap) {
        const yjsMapNode = nodeM.ymap;
        const childrenAtom = getYjsBindedAtom(yjsMapNode, "children");
        const titleAtom = atom(yjsMapNode.get("title"));
        this.id = yjsMapNode.get("id");
        this.title = titleAtom;
        this.parent = yjsMapNode.get("parent");
        this.other_parents = yjsMapNode.get("other_parents");
        this.children = childrenAtom;
        this.ydata = yjsMapNode.get("ydata");
        this.data = yjsMapNode.get("data");
        this.nodeTypeName = yjsMapNode.get("nodeTypeName");
        this.nodeType = null; // TODO: init the nodeType
        this.nodeM = nodeM

        this.tabs = yjsMapNode.get("tabs")
        this.tools = yjsMapNode.get("tools")
    }

}

export interface SupportedNodeTypesMap {
    [key: string]: typeof NodeType
}

export abstract class NodeType {
    name: string

    abstract render(node: NodeVM): React.ReactNode

    abstract renderTool1(node: NodeVM): React.ReactNode

    abstract renderTool2(node: NodeVM): React.ReactNode

    abstract renderPrompt(node: NodeVM): string

    abstract ydataInitialize(node: NodeVM): void
}