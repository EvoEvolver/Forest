import {getMongoClient} from "../mongoConnection.ts";
import {Collection, Db} from "mongodb";

export interface NodeSnapshot {
    treeId: string;
    nodeId: string;
    authorId: string;
    tag: string;
    data: any;
    date: Date;
}

export class NodeSnapshotService {
    private db: Db;
    private collection: Collection;

    constructor() {
        if (!getMongoClient()) {
            console.error("MongoDB client is not initialized. Please call setMongoConnection() first.");
            return;
        }
        this.db = getMongoClient().db("snapshot");
        this.collection = this.db.collection("nodeSnapshots");
    }

    /**
     * Save a snapshot for a node in a tree
     */
    async saveSnapshot(input: {
        treeId: string;
        nodeId: string;
        authorId: string;
        tag: string;
        data: any;
    }): Promise<void> {
        const snapshot: NodeSnapshot = {
            ...input,
            date: new Date(),
        };
        await this.collection.insertOne(snapshot);
    }

    /**
     * Query snapshots for a given treeId and nodeId
     */
    async getSnapshots(treeId: string, nodeId: string): Promise<NodeSnapshot[]> {
        const snapshots = await this.collection
            .find({treeId, nodeId})
            .sort({date: -1})
            .toArray();
        return snapshots.map((snap: any) => ({
            treeId: snap.treeId,
            nodeId: snap.nodeId,
            authorId: snap.authorId,
            tag: snap.tag,
            data: snap.data,
            date: snap.date instanceof Date ? snap.date : new Date(snap.date),
        }));
    }
}
