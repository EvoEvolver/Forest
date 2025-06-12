import {Collection, Db} from "mongodb";
import {getMongoClient} from "./mongoConnection";

export interface UserData {
    userId: string;
    starredTrees?: string[]; // Array of tree IDs that the user has starred
}


export class userDataManager {
    private db: Db;
    private collection: Collection<UserData>

    constructor() {
        const mongoClient = getMongoClient();
        if (!mongoClient) {
            console.error("MongoDB client is not initialized. Please call setMongoConnection() first.");
            return
        }
        this.db = mongoClient.db("userData");
        this.collection  = this.db.collection('users');
    }

    async getStarredTrees(userId: string): Promise<string[]> {
        const user = await this.collection.findOne({userId: userId});
        if (!user) {
            return [];
        }
        return user.starredTrees || [];
    }
    async addStarredTree(userId: string, treeId: string): Promise<void> {
        await this.collection.updateOne(
            {userId: userId},
            {$addToSet: {starredTrees: treeId}},
            {upsert: true}
        );
    }
    async removeStarredTree(userId: string, treeId: string): Promise<void>{
        await this.collection.updateOne(
            {userId: userId},
            {$pull: {starredTrees: treeId}}
        );
    }
}
