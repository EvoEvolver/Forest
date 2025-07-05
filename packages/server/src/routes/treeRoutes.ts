import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken, requireCreateTreePermission } from '../middleware/auth';
import { TreeService } from '../services/treeService';
import { TreeJson } from '@forest/schema';

export function createTreeRouter(treeService: TreeService): Router {
    const router = Router();

    // Create tree endpoint
    router.put('/createTree', authenticateToken, requireCreateTreePermission, (req: AuthenticatedRequest, res) => {
        console.log(`🌳 Tree creation request from authenticated user: ${req.user?.email}`);
        try {
            const treeJson = req.body.tree as TreeJson;
            const { treeId, rootTitle } = treeService.createTree(treeJson, req.user!.id);
            
            console.log(`✅ Tree '${rootTitle}' created successfully: ${treeId} for user: ${req.user?.email}`);
            res.json({ tree_id: treeId });
        } catch (error) {
            console.error(`❌ Error creating tree for user ${req.user?.email}:`, error);
            res.status(500).json({ error: 'An error occurred while creating the tree.' });
        }
    });

    // Duplicate tree endpoint
    router.put('/duplicateTree', (req, res) => {
        try {
            const originTreeId = req.body.origin_tree_id;
            const newTreeId = treeService.duplicateTree(originTreeId);
            res.json({ new_tree_id: newTreeId });
        } catch (error) {
            console.error('Error duplicating tree:', error);
            res.status(500).json({ error: 'Failed to duplicate tree' });
        }
    });

    // Get user trees endpoint
    router.get('/user/trees', authenticateToken, async (req: AuthenticatedRequest, res) => {
        console.log(`Fetching trees for user: ${req.user?.email}:${req.user?.id}`);
        try {
            const userTrees = await treeService.getUserTrees(req.user!.id);
            res.json({ trees: userTrees });
        } catch (error) {
            console.error(`Error fetching trees for user ${req.user?.email}:`, error);
            res.status(500).json({ error: 'Failed to fetch trees' });
        }
    });

    // Delete tree endpoint
    router.delete('/trees/:treeId', authenticateToken, (req: AuthenticatedRequest, res) => {
        const treeId = req.params.treeId;
        console.log(`Deleting tree ${treeId} for user: ${req.user?.email}`);

        try {
            treeService.deleteTree(treeId, req.user!.id);
            console.log(`Tree ${treeId} deleted successfully for user: ${req.user?.email}`);
            res.json({ success: true });
        } catch (error) {
            console.error(`Error deleting tree ${treeId} for user ${req.user?.email}:`, error);
            if (error instanceof Error && error.message.includes('permission')) {
                res.status(403).json({ error: error.message });
            } else if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete tree' });
            }
        }
    });

    return router;
} 