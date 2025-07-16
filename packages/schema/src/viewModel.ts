import * as Y from 'yjs'
import {Map as YMap} from 'yjs'
import {PrimitiveAtom} from "jotai";
import {atom} from "jotai/index";
import {getYjsBindedAtom, nodeMToNodeVMAtom} from "./node";
import {NodeM, TreeM, TreeMetadata} from "./model";
import {NodeType} from "./nodeType";

export type SupportedNodeTypesMap = (typeName: string) => Promise<NodeType>

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
    nodeMapObserver: any
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
        this.nodeMapObserver = (ymapEvent) => {
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

    initSelectedNode() {

    }

    commitViewToRender() {
        this.viewCommitNumber = this.viewCommitNumber + 1
        console.log("commit number: ", this.viewCommitNumber)
        this.set(this.viewCommitNumberAtom, this.viewCommitNumber)
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
    treeVM: TreeVM

    // legacy properties
    tabs: any
    tools: any

    static async create(nodeM, treeVM: TreeVM) {
        const nodeVM = new NodeVM(treeVM)
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

        nodeVM.nodeType = await nodeVM.getNodeType(treeVM.supportedNodesTypes)
        nodeVM.nodeType.ydataInitialize(nodeVM)

        return nodeVM
    }

    constructor(treeVM: TreeVM) {
        this.treeVM = treeVM
    }

    async getNodeType(supportedNodesTypes: SupportedNodeTypesMap): Promise<NodeType> {
        if (!this.nodeTypeName) {
            if (this.tabs["content"] === `<PaperEditorMain/>`) {
                this.nodeTypeName = "EditorNodeType"
            } else {
                this.nodeTypeName = "CustomNodeType"
            }
        }
        return await getNodeType(this.nodeTypeName, supportedNodesTypes)
    }

}

export async function getNodeType(nodeTypeName: string, supportedNodesTypes: SupportedNodeTypesMap): Promise<NodeType> {
    return await supportedNodesTypes(nodeTypeName)
}
