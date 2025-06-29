import crypto from "crypto";
import {getYDoc} from "./y-websocket/utils";
import {TreeJson, TreeM} from "@forest/schema";


export function createNewTree(treeJson: TreeJson): TreeM {
    const treeId = crypto.randomUUID();
    const doc = getYDoc(treeId)
    // @ts-ignore
    const tree = new TreeM(doc, treeId)
    tree.patchFromTreeJson(treeJson)
    return tree
}