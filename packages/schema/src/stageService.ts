import {NodeM} from "./model.ts";
import {httpUrl} from "./config.ts";

export const stageThisVersion = async (node: NodeM, tag: string) => {
    try {
        // Create a simple serializable object from the node data
        const nodeData = node.getSnapshot()
        const requestBody = {
            treeId: node.treeM.id(),
            nodeId: node.id,
            authorId: "admin",
            tag: tag,
            data: nodeData
        };
        console.log('Saving snapshot for node:', node.id, 'with tag:', tag);
        console.log('Request body:', requestBody);
        const response = await fetch(httpUrl + '/api/nodeSnapshot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save snapshot');
        }

        console.log('Snapshot saved successfully');

    } catch (error) {
        console.warn('Failed to save snapshot:', error);
        // You might want to show an error notification to the user here
    }
};