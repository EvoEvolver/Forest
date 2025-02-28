import {TreeData} from "./entities";


export const countChildren = (treeData: TreeData) => {
    if (!treeData){
        return
    }
    const nodeDict = treeData.nodeDict
    while(true){
        let changed = false
        for (let [nodeId, node] of Object.entries(nodeDict)){
            // if node has children_count, skip
            if(node.data["children_count"]){
                continue
            }
            // if node has no children, set children_count to 0
            if(node.children.length > 0){
                let count = 0
                for (let childId of node.children){
                    let childrenCount = nodeDict[childId].data["children_count"]
                    if(childrenCount !== null && childrenCount !== undefined){
                        count += 1 + childrenCount
                    }
                    else {
                        count = null
                        break
                    }
                }
                node.data["children_count"] = count
                if (count !== null)
                    changed = true
            }
            else{
                node.data["children_count"] = 0
            }
        }
        if(!changed){
            break
        }
    }
}