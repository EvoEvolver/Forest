import {atom} from "jotai";
import {treeAtom} from "./TreeState";

export const updateChildrenCountAtom = atom(null, (get, set, props) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    console.log("Count children")
    const nodeDict = currTree.nodeDict
    for (let nodeAtom of Object.values(nodeDict)){
        let node = get(nodeAtom);
        node.data["children_count"] = null; // reset children_count
    }
    while(true){
        let changed = false
        for (let nodeAtom of Object.values(nodeDict)){
            let node = get(nodeAtom);
            let nodeChildren = get(node.children);
            // if node has children_count, skip
            if(node.data["children_count"] !== null){
                continue
            }
            // if node has no children, set children_count to 0
            if(nodeChildren.length > 0){
                let count = 0
                for (let childId of nodeChildren){
                    let childrenCount = get(nodeDict[childId]).data["children_count"]
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
                changed = true
            }
        }
        if(!changed){
            break
        }
    }
})



