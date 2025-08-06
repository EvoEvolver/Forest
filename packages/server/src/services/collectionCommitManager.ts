import {getYDoc} from '../y-websocket/utils';

/**
 * Manages collection-level commit numbers for MongoDB DataGrid collaboration.
 * Each collection has a global commit number that increments when any data changes.
 * All DataGrid editors observing a collection refresh when its commit number changes.
 */
export class CollectionCommitManager {
    private static instance: CollectionCommitManager;
    private static readonly COMMITS_DOC_NAME = 'collection_commits';

    private constructor() {
    }

    public static getInstance(): CollectionCommitManager {
        if (!CollectionCommitManager.instance) {
            CollectionCommitManager.instance = new CollectionCommitManager();
        }
        return CollectionCommitManager.instance;
    }

    /**
     * Increment the commit number for a specific collection.
     * This notifies all DataGrid editors observing this collection to refresh.
     *
     * @param collectionName - The MongoDB collection name
     * @returns The new commit number
     */
    public incrementCommit(collectionName: string): number {
        try {
            // Get or create the global collection commits document
            const ydoc = getYDoc(CollectionCommitManager.COMMITS_DOC_NAME);
            const commitsMap = ydoc.getMap('commits');

            // Get current commit number and increment
            const currentCommit = (commitsMap.get(collectionName) as number) || 0;
            const newCommit = currentCommit + 1;

            // Update the commit number
            commitsMap.set(collectionName, newCommit);

            return newCommit;
        } catch (error) {
            console.warn(`Failed to increment commit for collection ${collectionName}:`, error);
            return 0;
        }
    }

    /**
     * Get the current commit number for a collection.
     *
     * @param collectionName - The MongoDB collection name
     * @returns The current commit number
     */
    public getCommit(collectionName: string): number {
        try {
            const ydoc = getYDoc(CollectionCommitManager.COMMITS_DOC_NAME);
            const commitsMap = ydoc.getMap('commits');
            return (commitsMap.get(collectionName) as number) || 0;
        } catch (error) {
            console.warn(`Failed to get commit for collection ${collectionName}:`, error);
            return 0;
        }
    }

    /**
     * Get all collection commit numbers.
     * Useful for debugging and monitoring.
     *
     * @returns Object with collection names as keys and commit numbers as values
     */
    public getAllCommits(): Record<string, number> {
        try {
            const ydoc = getYDoc(CollectionCommitManager.COMMITS_DOC_NAME);
            const commitsMap = ydoc.getMap('commits');
            return commitsMap.toJSON() as Record<string, number>;
        } catch (error) {
            console.warn('Failed to get all collection commits:', error);
            return {};
        }
    }

    /**
     * Reset commit number for a collection (useful for testing).
     *
     * @param collectionName - The MongoDB collection name
     */
    public resetCommit(collectionName: string): void {
        try {
            const ydoc = getYDoc(CollectionCommitManager.COMMITS_DOC_NAME);
            const commitsMap = ydoc.getMap('commits');
            commitsMap.set(collectionName, 0);
        } catch (error) {
            console.warn(`Failed to reset commit for collection ${collectionName}:`, error);
        }
    }
}