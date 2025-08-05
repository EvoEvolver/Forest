import crypto from 'crypto';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import { getYDoc } from '../y-websocket/utils';
import { TreeJson, TreeM } from '@forest/schema';
import { TreeMetadataManager } from './treeMetadata';

export class TreeService {
    constructor(private treeMetadataManager: TreeMetadataManager) {}

    createTree(treeJson: TreeJson, userId: string): { treeId: string; rootTitle: string } {
        const tree: TreeM = createNewTree(treeJson);
        const rootId = treeJson.metadata.rootId;
        const rootTitle = tree.nodeDict.get(rootId).get("title");

        // Update metadata
        tree.ydoc.transact(() => {
            const metadata = tree.ydoc.getMap("metadata");
            metadata.set("version", "0.0.1");
        });

        const treeId = tree.id();
        this.treeMetadataManager.createTree(treeId, userId, rootTitle).catch(() => {});

        return { treeId, rootTitle };
    }

    duplicateTree(originTreeId: string): string {
        const originDoc = getYDoc(originTreeId);
        const nodeDict = originDoc.getMap("nodeDict");
        const nodeCount = nodeDict.size;

        // Generate new document ID
        const newDocId = crypto.randomUUID();
        const newDoc = getYDoc(newDocId);
        const stateOrigin = encodeStateAsUpdate(originDoc);
        applyUpdate(newDoc, stateOrigin);

        console.log(`Tree duplicated: ${originTreeId} -> ${newDocId} with ${nodeCount} nodes`);
        return newDocId;
    }

    deleteTree(treeId: string, userId: string): boolean {
        // Check if user is owner
        if (!this.treeMetadataManager.isOwner(treeId, userId)) {
            throw new Error('You do not have permission to delete this tree.');
        }

        const deleted = this.treeMetadataManager.deleteTree(treeId);
        if (!deleted) {
            throw new Error('Tree not found');
        }

        return true;
    }

    getUserTrees(userId: string) {
        return this.treeMetadataManager.getUserTrees(userId);
    }

    getTreeMetadata(treeId: string) {
        return this.treeMetadataManager.getTreeMetadata(treeId);
    }

    async getMultipleTreeMetadata(treeIds: string[]) {
        const metadataPromises = treeIds.map(treeId => 
            this.treeMetadataManager.getTreeMetadata(treeId)
        );
        const metadataResults = await Promise.all(metadataPromises);
        
        // Create a map of treeId to metadata
        const metadataMap: { [key: string]: any } = {};
        treeIds.forEach((treeId, index) => {
            const metadata = metadataResults[index];
            metadataMap[treeId] = metadata ? {
                treeId: metadata.treeId,
                title: metadata.title || 'Untitled Tree',
                owner: metadata.owner,
                createdAt: metadata.createdAt,
                lastAccessed: metadata.lastAccessed
            } : {
                treeId: treeId,
                title: 'Unknown Tree',
                owner: null,
                createdAt: null,
                lastAccessed: null
            };
        });
        
        return metadataMap;
    }
}

function createNewTree(treeJson: TreeJson): TreeM {
    const treeId = crypto.randomUUID();
    const doc = getYDoc(treeId)
    // @ts-ignore
    const tree = new TreeM(doc)
    tree.patchFromTreeJson(treeJson, treeId)
    return tree
}