import {getMongoClient} from "../mongoConnection.ts";
import {Collection, Db} from "mongodb";

export interface TreeMetadata {
    treeId: string
    owner: string;
    createdAt: Date;
    lastAccessed: Date;
    title?: string;
    nodeCount?: number;
    deleted?: boolean; // optional field to mark if the tree is deleted
    deletedAt?: Date; // optional field to store deletion time
}

export class TreeMetadataManager {
    private db: Db;
    private collection: Collection

    constructor() {
        if (!getMongoClient()) {
            console.error("MongoDB client is not initialized. Please call setMongoConnection() first.");
            return
        }
        this.db = getMongoClient().db("treeMetaData");
        this.collection = this.db.collection('trees');
    }

    /**
     * Create new tree metadata
     */
    async createTree(treeId: string, ownerId: string, title?: string): Promise<void> {
        const metadata: TreeMetadata = {
            treeId: treeId,
            owner: ownerId,
            createdAt: new Date(),
            lastAccessed: new Date(),
            title: title || 'Untitled Tree',
            nodeCount: 1
        };
        await this.collection.insertOne(metadata);
    }

    async getTreeMetadata(treeId: string): Promise<TreeMetadata | null> {
        const tree = await this.collection.findOne({treeId: treeId, deleted: {$ne: true}});
        return tree ? {
            treeId: tree.treeId,
            owner: tree.owner,
            createdAt: tree.createdAt,
            lastAccessed: tree.lastAccessed,
            title: tree.title || '',
            nodeCount: tree.nodeCount || 0,
            deleted: tree.deleted || false,
            deletedAt: tree.deletedAt || null
        } : null;
    }

    async updateLastAccessed(treeId: string): Promise<void> {
        await this.collection.updateOne(
            {treeId: treeId},
            {$set: {lastAccessed: new Date()}}
        );
    }

    async updateLastAccessedAndNodeCount(treeId: string, nodeCount: number): Promise<void> {
        await this.collection.updateOne(
            {treeId: treeId},
            {
                $set: {
                    lastAccessed: new Date(),
                    nodeCount: nodeCount
                }
            }
        );
    }

    async getUserTrees(userId: string): Promise<Array<TreeMetadata>> {
        const trees = await this.collection
            .find({
                owner: userId,
                deleted: {$ne: true}
            })
            .sort({lastAccessed: -1})
            .toArray()
        return trees.map(tree => ({
            treeId: tree.treeId,
            owner: tree.owner,
            createdAt: tree.createdAt,
            lastAccessed: tree.lastAccessed,
            title: tree.title || '',
            nodeCount: tree.nodeCount || 0,
            deleted: tree.deleted || false,
            deletedAt: tree.deletedAt || null
        }))
    }

    async isOwner(treeId: string, userId: string): Promise<boolean> {
        const tree = await this.collection.findOne(
            {treeId: treeId},
            {projection: {owner: 1}}
        );
        return tree ? tree.owner === userId : false;
    }

    async deleteTree(treeId: string): Promise<boolean> {
        const result = await this.collection.updateOne(
            {treeId: treeId},
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date()
                }
            }
        );
        return result.modifiedCount === 1;
    }

    async updateTreeTitle(treeId: string, title: string): Promise<void> {
        await this.collection.updateOne(
            {treeId: treeId},
            {$set: {title}}
        );
    }

    async updateNodeCount(treeId: string, count: number): Promise<void> {
        await this.collection.updateOne(
            {treeId: treeId},
            {$set: {nodeCount: count}}
        );
    }
}