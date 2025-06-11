export interface TreeMetadata {
    owner: string;
    createdAt: Date;
    lastAccessed: Date;
    title?: string;
    nodeCount?: number;
}
// forest_server/src/treeMetadata.ts

export interface TreeMetadata {
    owner: string;
    createdAt: Date;
    lastAccessed: Date;
    title?: string;
    nodeCount?: number;
}

/**
 * 
 * TODO: replace with database implementation
 */
class TreeMetadataManager {
    private treeMetadata: Map<string, TreeMetadata> = new Map();

    /**
     * Create new tree metadata
     */
    createTree(treeId: string, ownerId: string, title?: string): void {
        const metadata: TreeMetadata = {
            owner: ownerId,
            createdAt: new Date(),
            lastAccessed: new Date(),
            title: title || 'Untitled Tree',
            nodeCount: 1 
        };
        
        this.treeMetadata.set(treeId, metadata);
        console.log(`tree metadata created: ${treeId} for user: ${ownerId}`);
    }

    /**
     * Get tree metadata
     */
    getTreeMetadata(treeId: string): TreeMetadata | null {
        return this.treeMetadata.get(treeId) || null;
    }

    /**
     * Update last accessed time
     */
    updateLastAccessed(treeId: string): void {
        const metadata = this.treeMetadata.get(treeId);
        if (metadata) {
            metadata.lastAccessed = new Date();
        }
    }

    /**
     * Get all trees of a user
     */
    getUserTrees(userId: string): Array<{id: string, metadata: TreeMetadata}> {
        const userTrees: Array<{id: string, metadata: TreeMetadata}> = [];
        
        for (const [treeId, metadata] of this.treeMetadata.entries()) {
            if (metadata.owner === userId) {
                userTrees.push({ id: treeId, metadata });
            }
        }
        
        // sort by last accessed time
        userTrees.sort((a, b) => 
            b.metadata.lastAccessed.getTime() - a.metadata.lastAccessed.getTime()
        );
        
        return userTrees;
    }

    /**
     * check if the user is the owner of the tree
     */
    isOwner(treeId: string, userId: string): boolean {
        const metadata = this.treeMetadata.get(treeId);
        return metadata ? metadata.owner === userId : false;
    }

    /**
     * delete whole tree
     */
    deleteTree(treeId: string): boolean {
        return this.treeMetadata.delete(treeId);
    }

    /**
     * Update tree title
     */
    updateTreeTitle(treeId: string, title: string): void {
        const metadata = this.treeMetadata.get(treeId);
        if (metadata) {
            metadata.title = title;
        }
    }

    /**
     * Update node count
     */
    updateNodeCount(treeId: string, count: number): void {
        const metadata = this.treeMetadata.get(treeId);
        if (metadata) {
            metadata.nodeCount = count;
        }
    }

    /**
     * Get info of all trees
     */
    getStats(): { totalTrees: number, totalUsers: number } {
        const uniqueUsers = new Set(
            Array.from(this.treeMetadata.values()).map(m => m.owner)
        );
        
        return {
            totalTrees: this.treeMetadata.size,
            totalUsers: uniqueUsers.size
        };
    }
}


export const treeMetadataManager = new TreeMetadataManager();