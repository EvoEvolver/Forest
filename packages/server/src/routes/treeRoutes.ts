import {Router} from 'express';
import {AuthenticatedRequest, authenticateToken, requireCreateTreePermission} from '../middleware/auth';
import {TreeService} from '../services/treeService';
import {TreeJson} from '@forest/schema';
// Get the Y.js document and convert to TreeJson
import {TreeM} from '@forest/schema'
import {getYDoc} from "../y-websocket/utils.ts";


export function createTreeRouter(treeService: TreeService): Router {
    const router = Router();

    // Create tree endpoint
    router.put('/createTree', authenticateToken, requireCreateTreePermission, (req: AuthenticatedRequest, res) => {
        console.log(`🌳 Tree creation request from authenticated user: ${req.user?.email}`);
        try {
            const treeJson = req.body.tree as TreeJson;
            const treeId = treeService.createTree(treeJson, req.user!.id);

            console.log(`✅ Tree created successfully: ${treeId} for user: ${req.user?.email}`);
            res.json({tree_id: treeId});
        } catch (error) {
            console.error(`❌ Error creating tree for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'An error occurred while creating the tree.'});
        }
    });

    // Duplicate tree endpoint
    router.put('/duplicateTree', (req, res) => {
        try {
            const originTreeId = req.body.origin_tree_id;
            const newTreeId = treeService.duplicateTree(originTreeId);
            res.json({new_tree_id: newTreeId});
        } catch (error) {
            console.error('Error duplicating tree:', error);
            res.status(500).json({error: 'Failed to duplicate tree'});
        }
    });

    // Get user trees endpoint
    router.get('/user/trees', authenticateToken, async (req: AuthenticatedRequest, res) => {
        console.log(`Fetching trees for user: ${req.user?.email}:${req.user?.id}`);
        try {
            const userTrees = await treeService.getUserTrees(req.user!.id);
            res.json({trees: userTrees});
        } catch (error) {
            console.error(`Error fetching trees for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to fetch trees'});
        }
    });

    // Get metadata for multiple trees endpoint
    router.post('/trees/metadata', authenticateToken, async (req: AuthenticatedRequest, res) => {
        console.log(`Fetching metadata for multiple trees for user: ${req.user?.email}`);
        try {
            const {treeIds} = req.body;

            if (!treeIds || !Array.isArray(treeIds)) {
                res.status(400).json({error: 'treeIds array is required'});
                return;
            }

            const metadataMap = await treeService.getMultipleTreeMetadata(treeIds);
            res.json(metadataMap);
        } catch (error) {
            console.error(`Error fetching metadata for multiple trees:`, error);
            res.status(500).json({error: 'Failed to fetch tree metadata'});
        }
    });

    // Get tree data endpoint
    router.get('/trees/:treeId', authenticateToken, async (req: AuthenticatedRequest, res) => {
        const treeId = req.params.treeId;
        console.log(`Fetching tree ${treeId} for user: ${req.user?.email}`);

        try {
            // Check if user has access to this tree
            const metadata = await treeService.getTreeMetadata(treeId);
            if (!metadata) {
                res.status(404).json({error: 'Tree not found'});
                return;
            }

            // For now, allow access if user is owner or has visited the tree
            // You might want to add more sophisticated permission checking
            if (metadata.owner !== req.user!.id) {
                // Could check if user has visited this tree
                res.status(403).json({error: 'Access denied'});
                return;
            }

            const ydoc = getYDoc(treeId);
            const treeM = new TreeM(ydoc);

            // Manually construct TreeJson from TreeM
            const treeJson: TreeJson = {
                metadata: {
                    rootId: treeM.metadata.get('rootId'),
                    treeId: treeId
                },
                nodeDict: {}
            };

            // Convert nodeDict from Y.js to plain object
            treeM.nodeDict.forEach((nodeYMap, nodeId) => {
                const children = nodeYMap.get('children');
                treeJson.nodeDict[nodeId] = {
                    id: nodeId,
                    title: nodeYMap.get('title') || '',
                    parent: nodeYMap.get('parent') || null,
                    children: children ? children.toJSON() : [],
                    data: nodeYMap.get('data') || {},
                    nodeTypeName: nodeYMap.get('nodeTypeName') || 'default',
                    tabs: nodeYMap.get('tabs'),
                    tools: nodeYMap.get('tools')
                };
            });

            res.json({tree: treeJson});
        } catch (error) {
            console.error(`Error fetching tree ${treeId} for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to fetch tree'});
        }
    });

    // Delete tree endpoint
    router.delete('/trees/:treeId', authenticateToken, (req: AuthenticatedRequest, res) => {
        const treeId = req.params.treeId;
        console.log(`Deleting tree ${treeId} for user: ${req.user?.email}`);

        try {
            treeService.deleteTree(treeId, req.user!.id);
            console.log(`Tree ${treeId} deleted successfully for user: ${req.user?.email}`);
            res.json({success: true});
        } catch (error) {
            console.error(`Error deleting tree ${treeId} for user ${req.user?.email}:`, error);
            if (error instanceof Error && error.message.includes('permission')) {
                res.status(403).json({error: error.message});
            } else if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({error: error.message});
            } else {
                res.status(500).json({error: 'Failed to delete tree'});
            }
        }
    });


    return router;
} 