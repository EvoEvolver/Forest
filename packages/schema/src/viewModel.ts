import * as Y from 'yjs'
import {Map as YMap} from 'yjs'
import {atom, PrimitiveAtom} from "jotai";
import {NodeM, TreeM, TreeMetadata} from "./model";
import {NodeTypeVM} from "./nodeTypeVM.ts";
import {NodeTypeM} from "./nodeTypeM.ts";

export type SupportedNodeTypesVM = (typeName: string) => Promise<typeof NodeTypeVM>;

/*
The data type hold only by the frontend as ViewModel (VM) for components to consume
 */
export class TreeVM {
    metadata: PrimitiveAtom<TreeMetadata>
    nodeDict: Record<string, PrimitiveAtom<NodeVM>>
    treeM: TreeM
    get: any
    set: any
    nodeMapObserver: any
    viewCommitNumberAtom = atom(0)
    viewCommitNumber: number = 0
    supportedNodeTypesVM: SupportedNodeTypesVM

    /*
    The constructor links the TreeVM to the TreeM
     */
    constructor(treeM: TreeM, get, set, supportedNodeTypesVM: SupportedNodeTypesVM) {
        this.get = get
        this.set = set
        this.treeM = treeM
        this.supportedNodeTypesVM = supportedNodeTypesVM
        this.nodeDict = {}
        let nodeDictyMap: YMap<YMap<any>> = treeM.nodeDict
        this.nodeMapObserver = (ymapEvent) => {
            let promises: Promise<void>[] = [];
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key, treeM);
                    promises.push(this.addNode(newNode));
                } else if (change.action === 'update') {
                    let newNode = new NodeM(nodeDictyMap.get(key), key, treeM);
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
        }
        nodeDictyMap.observe(this.nodeMapObserver);
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

    deconstruct() {
        this.treeM.nodeDict.unobserve(this.nodeMapObserver);

        // Reset instance variables
        this.nodeDict = {};
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
        this.nodeDict[newNode.id] = await nodeMToNodeVMAtom(newNode, this)
    }

    deleteNode(nodeId: string) {
        delete this.nodeDict[nodeId];
    }

    commitViewToRender() {
        this.viewCommitNumber = this.viewCommitNumber + 1
        //console.log("commit number: ", this.viewCommitNumber)
        this.set(this.viewCommitNumberAtom, this.viewCommitNumber)
    }

    getNonReactiveNodeInfo(nodeId: string): { title: string, children: string[], parent: string | null } | null {
        const nodeM = this.treeM.getNode(nodeId)
        if (!nodeM) {
            return null;
        }
        return {
            title: nodeM.title(),
            children: nodeM.children().toJSON(),
            parent: nodeM.parent(),
        }
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
    // normal data that does not require collaboration
    data: any
    // yjs data. The most collaborative one
    ydataAtom: PrimitiveAtom<any>
    ydata: Y.Map<string>
    // data for UI. Will not be synced and saved
    vdata: any
    nodeTypeName: string
    nodeType: typeof NodeTypeM
    nodeTypeVM: typeof NodeTypeVM
    nodeM: NodeM
    treeVM: TreeVM

    // legacy properties
    tabs: any
    tools: any

    static async create(nodeM: NodeM, treeVM: TreeVM) {
        const nodeVM = new NodeVM(treeVM)
        const yjsMapNode = nodeM.ymap;
        const childrenAtom = getYjsJsonAtom(yjsMapNode, "children");
        const titleAtom = atom(nodeM.title());
        nodeVM.id = nodeM.id
        nodeVM.title = titleAtom;
        nodeVM.parent = nodeM.parent()
        nodeVM.children = childrenAtom;
        nodeVM.data = nodeM.data()
        nodeVM.ydata = nodeM.ydata()
        nodeVM.ydataAtom = atom(nodeM.ydata());

        nodeVM.vdata = {}
        nodeVM.nodeTypeName = nodeM.nodeTypeName()
        nodeVM.nodeM = nodeM

        if (yjsMapNode.has("tabs"))
            nodeVM.tabs = yjsMapNode.get("tabs")
        if (yjsMapNode.has("tools"))
            nodeVM.tools = yjsMapNode.get("tools")
        nodeVM.nodeType = nodeM.nodeType()
        nodeVM.nodeTypeVM = await nodeVM.getNodeType(treeVM.supportedNodeTypesVM)
        return nodeVM
    }

    constructor(treeVM: TreeVM) {
        this.treeVM = treeVM
    }

    async getNodeType(supportedNodesTypes: SupportedNodeTypesVM): Promise<typeof NodeTypeVM> {
        if (!this.nodeTypeName) {
            if (this?.tabs["content"] === `<PaperEditorMain/>`) {
                this.nodeTypeName = "EditorNodeType"
                this.nodeM.ymap.set("nodeTypeName", this.nodeTypeName)
            } else {
                this.nodeTypeName = "CustomNodeType"
                this.nodeM.ymap.set("nodeTypeName", this.nodeTypeName)
            }
        }
        return await supportedNodesTypes(this.nodeTypeName)
    }

    commitDataChange() {
        this.nodeM.ymap.set("data", this.data)
    }
}

function getYmapShallowJson(yMap: YMap<any>): Map<string, any> {
    const jsonMap = new Map<string, any>();
    yMap.forEach((value, key) => {
        jsonMap.set(key, value);
    });
    return jsonMap;
}

function getYdataAtom(node: NodeVM) {
    if (!node.ydata) {
        console.warn(`Node ${node.id} does not have ydata, returning empty atom.`);
        return atom({});
    }
    const ydataAtom = atom(getYmapShallowJson(node.ydata));
    ydataAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            set(getYmapShallowJson(node.ydata))
        }
        node.ydata.observe(observeFunc)
        set(getYmapShallowJson(node.ydata))
        return () => {
            node.ydata.unobserve(observeFunc)
        }
    }
    return ydataAtom
}

function getYjsJsonAtom(yjsMapNode: YMap<any>, key: string): PrimitiveAtom<any> {
    const yjsValue = yjsMapNode.get(key)
    // check if yjsValue has a toJSON method, if not, return a simple atom
    let yjsAtom: PrimitiveAtom<any>;
    if (typeof yjsValue.toJSON === 'function') {
        yjsAtom = atom(yjsValue.toJSON())
    } else {
        console.warn(`Yjs value for key "${key}" does not have a toJSON method, using a simple atom instead.`);
    }
    yjsAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            set(yjsValue.toJSON())
        }
        yjsValue.observe(observeFunc)
        set(yjsValue.toJSON())
        return () => {
            yjsValue.unobserve(observeFunc)
        }
    }
    return yjsAtom
}

async function nodeMToNodeVMAtom(nodeM: NodeM, treeVM: TreeVM): Promise<PrimitiveAtom<NodeVM>> {
    const node: NodeVM = await NodeVM.create(nodeM, treeVM)
    const nodeAtom: PrimitiveAtom<NodeVM> = atom(node)

    nodeAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            {
                ymapEvent.changes.keys.forEach((change, key) => {
                    //console.log(key, change, "change in ydata: ", nodeM.ymap.get("ydata"))
                    /*if (change.action !== 'update') {
                        throw Error(`Property "${key}" was ${change.action}, which is not supported.`)
                    }*/
                })
            }
            NodeVM.create(nodeM, treeVM).then(newNode => {
                set(newNode)
                console.log("new node set", newNode)
            })
        }
        nodeM.ymap.observe(observeFunc)
        nodeM.ymap.get("ydata").observe(observeFunc)
        NodeVM.create(nodeM, treeVM).then(newNode => {
            set(newNode)
        })
        return () => {
            nodeM.ymap.unobserve(observeFunc)
            nodeM.ymap.get("ydata").unobserve(observeFunc)
        }
    }
    return nodeAtom
}
