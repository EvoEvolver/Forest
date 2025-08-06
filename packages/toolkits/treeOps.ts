import axios from 'axios';
import {v4 as uuidv4} from 'uuid';

import {NodeJson, TreeJson, TreeM, TreeMetadata} from '@forest/schema'
import * as Y from 'yjs';

export async function pushTreeData(
    treeData: TreeJson,
    host: string = 'http://0.0.0.0:29999',
    token?: string
): Promise<string | undefined> {
    const url = `${host}/api/createTree`;
    const rootId = treeData.metadata.rootId;

    const payload = {
        tree: treeData,
        root_id: rootId.toString()
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await axios.put(url, payload, {headers});

        if (response.status === 200) {
            const responseData = response.data;
            if ('tree_id' in responseData) {
                const treeId = responseData.tree_id;
                console.log(`Tree updated successfully with ID: ${treeId}`);
                console.log(`Created tree to ${host}/?id=${treeId}`);
                console.log(`For dev, go to http://localhost:39999/?id=${treeId}`);
                return treeId;
            } else {
                console.log('Tree updated but no tree_id returned.');
                return undefined;
            }
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Failed to update tree: ${error.response?.status} - ${error.response?.data}`);
            throw error;
        }
        throw error;
    }
}


export async function createNewTree(rootNodeTypeName: string, host: string = 'http://0.0.0.0:29999',
                                    token?: string) {
    const nodeId = uuidv4()
    const newRootJson: NodeJson = {
        title: "Root",
        children: [],
        id: nodeId,
        parent: null,
        data: {},
        nodeTypeName: rootNodeTypeName
    }
    const newTreeMetadata: TreeMetadata = {
        rootId: newRootJson.id
    }
    const newTreeJson: TreeJson = {
        nodeDict: {
            [nodeId]: newRootJson
        },
        metadata: newTreeMetadata
    }
    return await pushTreeData(newTreeJson, host, token)
}

export async function createEmptyNewTree(host: string = 'http://0.0.0.0:29999',
                                    token?: string) {
    const newTreeMetadata: TreeMetadata = {
        rootId: ""
    }
    const newTreeJson: TreeJson = {
        nodeDict: {
        },
        metadata: newTreeMetadata
    }
    return await pushTreeData(newTreeJson, host, token)
}

export async function duplicateTree(treeId: string, sourceHost: string = 'http://0.0.0.0:29999',
                                    targetHost: string = 'http://0.0.0.0:29999', token?: string) {
    const [sourceTree, wsProvider1] = TreeM.treeFromWs(sourceHost.replace("http", "ws"), treeId)
    const newTreeId = await createEmptyNewTree(targetHost, token)
    const [targetTree, wsProvider2] = TreeM.treeFromWs(targetHost.replace("http", "ws"), newTreeId)


    return new Promise<string>((resolve, reject) => {
        // Wait for source tree to sync
        wsProvider1.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                console.log('Source tree synced, copying data...')

                // Export state from source ydoc and apply it to target ydoc
                const sourceState = Y.encodeStateAsUpdate(sourceTree.ydoc)
                Y.applyUpdate(targetTree.ydoc, sourceState)

                // Wait for target tree to sync
                wsProvider2.on('sync', (isTargetSynced: boolean) => {
                    if (isTargetSynced) {
                        console.log('Target tree synced, duplication complete')

                        // Clean up connections
                        wsProvider1.disconnect()
                        wsProvider2.disconnect()

                        // Return the new tree ID
                        resolve(newTreeId)
                    }
                })
            }
        })

        // Set a timeout to prevent hanging
        setTimeout(() => {
            wsProvider1.disconnect()
            wsProvider2.disconnect()
            reject(new Error('Duplication timeout'))
        }, 30000) // 30 second timeout
    })
}

