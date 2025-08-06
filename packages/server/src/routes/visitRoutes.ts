import {Response, Router} from 'express';
import {AuthenticatedRequest, authenticateToken} from '../middleware/auth';
import {TreeVisitManager} from '../services/treeVisitTracker';
import {TreeMetadataManager} from '../services/treeMetadata';

export function createVisitRouter(
    treeVisitManager: TreeVisitManager,
    treeMetadataManager: TreeMetadataManager
): Router {
    const router = Router();

    // Record tree visit endpoint
    router.post('/recordTreeVisit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
        console.log(`Recording tree visit for user: ${req.user?.id}`);
        try {
            const {treeId} = req.body;

            // Validate required parameters
            if (!treeId) {
                res.status(400).json({error: 'treeId is required.'});
                return;
            }

            // Record the visit using TreeVisitManager
            await treeVisitManager.recordTreeVisit(req.user!.id, treeId);

            console.log(`Successfully recorded visit to tree ${treeId} for user: ${req.user?.email}`);
            res.json({success: true});
        } catch (error) {
            console.error(`Error recording tree visit for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to record tree visit'});
        }
    });

    // Get user's visited trees with full metadata
    router.get('/user/visitedTrees', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
        console.log(`Fetching visited trees for user: ${req.user?.email}`);
        try {
            // Get visited tree IDs with last visit times
            const visitedTrees = await treeVisitManager.getVisitedTrees(req.user!.id);

            // Get metadata for each visited tree
            const treesWithMetadata = await Promise.all(
                visitedTrees.map(async (visit) => {
                    const metadata = await treeMetadataManager.getTreeMetadata(visit.treeId);
                    if (metadata) {
                        return {
                            treeId: metadata.treeId,
                            owner: metadata.owner,
                            createdAt: metadata.createdAt,
                            lastAccessed: metadata.lastAccessed,
                            title: metadata.title,
                            nodeCount: metadata.nodeCount,
                            deleted: metadata.deleted,
                            deletedAt: metadata.deletedAt,
                            lastVisited: visit.lastVisited  // Add visit time from tracking
                        };
                    }
                    return null;
                })
            );

            // Filter out null results (trees that no longer exist) and sort by last visit
            const validTrees = treesWithMetadata
                .filter(tree => tree !== null)
                .sort((a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime());

            res.json({trees: validTrees});
        } catch (error) {
            console.error(`Error fetching visited trees for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to fetch visited trees'});
        }
    });

    // Remove a tree from user's visit history
    router.delete('/user/visitedTrees/:treeId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
        console.log(`Removing tree ${req.params.treeId} from visit history for user: ${req.user?.email}`);
        try {
            const {treeId} = req.params;

            // Remove the visit record using TreeVisitManager
            await treeVisitManager.removeTreeVisit(req.user!.id, treeId);

            console.log(`Successfully removed tree ${treeId} from visit history for user: ${req.user?.email}`);
            res.json({success: true});
        } catch (error) {
            console.error(`Error removing tree from visit history for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to remove tree from visit history'});
        }
    });

    return router;
} 