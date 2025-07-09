import { getMongoClient } from "../mongoConnection.ts";
import { Collection, Db } from "mongodb";

export type PermissionType = "owner" | "editor" | "viewer";

export interface TreeUserPermission {
    treeId: string;
    userId: string;
    permissionType: PermissionType;
}

export class TreeUserPermissionManager {
    private db: Db;
    private collection: Collection;

    constructor() {
        if (!getMongoClient()) {
            console.error("MongoDB client is not initialized. Please call setMongoConnection() first.");
            return;
        }
        this.db = getMongoClient().db("treeMetaData");
        this.collection = this.db.collection("treeUserPermissions");
    }

    /**
     * Grant a permission to a user for a tree
     */
    async grantPermission(treeId: string, userId: string, permissionType: PermissionType): Promise<void> {
        await this.collection.updateOne(
            { treeId, userId },
            { $set: { permissionType } },
            { upsert: true }
        );
    }

    /**
     * Revoke a user's permission for a tree
     */
    async revokePermission(treeId: string, userId: string): Promise<void> {
        await this.collection.deleteOne({ treeId, userId });
    }

    /**
     * Get a user's permission for a tree
     */
    async getPermission(treeId: string, userId: string): Promise<TreeUserPermission | null> {
        const perm = await this.collection.findOne({ treeId, userId });
        return perm ? {
            treeId: perm.treeId,
            userId: perm.userId,
            permissionType: perm.permissionType
        } : null;
    }

    /**
     * List all users and their permissions for a tree
     */
    async listPermissionsForTree(treeId: string): Promise<TreeUserPermission[]> {
        const perms = await this.collection.find({ treeId }).toArray();
        console.log(123)
        return perms.map(perm => ({
            treeId: perm.treeId,
            userId: perm.userId,
            permissionType: perm.permissionType
        }));
    }

    /**
     * List all trees a user has access to
     */
    async listPermissionsForUser(userId: string): Promise<TreeUserPermission[]> {
        const perms = await this.collection.find({ userId }).toArray();
        return perms.map(perm => ({
            treeId: perm.treeId,
            userId: perm.userId,
            permissionType: perm.permissionType
        }));
    }

    /**
     * Check if a user has a specific permission type for a tree
     */
    async hasPermission(treeId: string, userId: string, permissionType: PermissionType): Promise<boolean> {
        const perm = await this.collection.findOne({ treeId, userId, permissionType });
        return !!perm;
    }
}
