import {Collection, Db} from "mongodb";
import {getMongoClient} from "../mongoConnection.ts";

export interface TreeVisitRecord {
    userId: string;
    treeId: string;
    lastVisited: Date;
}

export class TreeVisitManager {
    private db: Db;
    private collection: Collection<TreeVisitRecord>

    constructor() {
        const mongoClient = getMongoClient();
        if (!mongoClient) {
            console.error("MongoDB client is not initialized. Please call setMongoConnection() first.");
            return
        }
        this.db = mongoClient.db("treeVisits");
        this.collection = this.db.collection('treeVisits');
    }

    async getVisitedTrees(userId: string): Promise<Array<{ treeId: string, lastVisited: Date }>> {
        const visitedTrees = await this.collection
            .find({userId: userId})
            .sort({lastVisited: -1})
            .toArray();

        return visitedTrees.map(tree => ({
            treeId: tree.treeId,
            lastVisited: tree.lastVisited
        }));
    }

    async recordTreeVisit(userId: string, treeId: string): Promise<void> {
        const now = new Date();

        // Try to update if exists
        const result = await this.collection.updateOne(
            {userId: userId, treeId: treeId},
            {$set: {lastVisited: now}},
        );

        // If no document was updated (doesn't exist), insert new one
        if (result.matchedCount === 0) {
            await this.collection.insertOne({
                userId: userId,
                treeId: treeId,
                lastVisited: now
            });
        }
    }

    async removeTreeVisit(userId: string, treeId: string): Promise<void> {
        await this.collection.deleteOne({
            userId: userId,
            treeId: treeId
        });
    }
}
