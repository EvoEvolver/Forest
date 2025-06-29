import * as Y from "yjs";

class TreeData {
    nodeDict: { [key: string]: any };

    constructor() {
        this.nodeDict = {}
    }
}

export function nodeToMap(node: any): Y.Map<any> {
    const ymapForNode = new Y.Map()
    for (let key in node) {
        if (key == "ydata") {
            let ymapForyData = new Y.Map()
            let ydataDict = node["ydata"]
            for (let dataKey in ydataDict) {
                ymapForyData.set(dataKey, ydataDict[dataKey])
            }
            ymapForNode.set("ydata", ymapForyData)
        } else if (key == "children") {
            let yarrayForChildren = new Y.Array()
            yarrayForChildren.insert(0, node["children"])
            ymapForNode.set("children", yarrayForChildren)
        } else if (key == "title") {
            ymapForNode.set("title", node["title"])
        } else {
            ymapForNode.set(key, node[key])
        }
    }
    if (!node.ydata) {
        ymapForNode.set("ydata", new Y.Map())
    }
    return ymapForNode
}

export function patchTree(nodeDict: Y.Map<any>, patchTree: TreeData) {
    if (patchTree.nodeDict === null)
        return
    for (let key in patchTree.nodeDict) {
        const newNode = patchTree.nodeDict[key];
        if (newNode === null) {
            if (nodeDict.has(key)) {
                nodeDict.delete(key)
            }
        } else {
            const newNodeMap = nodeToMap(newNode)
            nodeDict.set(key, newNodeMap)
        }
    }
}