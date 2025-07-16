import {Map as YMap} from "yjs";
import {atom, PrimitiveAtom} from "jotai/index";
import {NodeVM, TreeVM} from "./viewModel";
import {NodeM} from "./model";


export function getYjsBindedAtom(yjsMapNode: YMap<any>, key: string): PrimitiveAtom<any> {
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

export async function nodeMToNodeVMAtom(nodeM: NodeM, treeVM: TreeVM): Promise<PrimitiveAtom<NodeVM>> {
    const node: NodeVM = await NodeVM.create(nodeM, treeVM)
    const nodeAtom: PrimitiveAtom<NodeVM> = atom(node)

    nodeAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            {
                ymapEvent.changes.keys.forEach((change, key) => {
                    if (change.action !== 'update') {
                        throw Error(`Property "${key}" was ${change.action}, which is not supported.`)
                    }
                })
            }
            NodeVM.create(nodeM, treeVM).then(newNode => {
                set(newNode)
            })
        }
        nodeM.ymap.observe(observeFunc)
        NodeVM.create(nodeM, treeVM).then(newNode => {
            set(newNode)
        })
        return () => {
            nodeM.ymap.unobserve(observeFunc)
        }
    }
    return nodeAtom
}