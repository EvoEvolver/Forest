import {Router} from 'express';
import {NodeSnapshotService} from '../services/nodeSnapshot';

export function createNodeSnapshotRouter(): Router {
    const router = Router();
    const nodeSnapshotService = new NodeSnapshotService();

    // Save a snapshot
    router.post('/nodeSnapshot', async (req, res) => {
        try {
            const {treeId, nodeId, authorId, tag, data} = req.body;
            if (!treeId || !nodeId || !authorId || !tag || data === undefined) {
                res.status(400).json({error: 'Missing required fields'});
                return;
            }
            await nodeSnapshotService.saveSnapshot({treeId, nodeId, authorId, tag, data});
            res.json({success: true});
        } catch (error) {
            console.error('Error saving node snapshot:', error);
            res.status(500).json({error: 'Failed to save snapshot'});
        }
    });

    // Query snapshots by treeId and nodeId
    router.get('/nodeSnapshot', async (req, res) => {
        try {
            const {treeId, nodeId} = req.query;
            if (!treeId || !nodeId) {
                res.status(400).json({error: 'Missing treeId or nodeId'});
                return;
            }
            const snapshots = await nodeSnapshotService.getSnapshots(treeId as string, nodeId as string);
            res.json({snapshots});
        } catch (error) {
            console.error('Error querying node snapshots:', error);
            res.status(500).json({error: 'Failed to query snapshots'});
        }
    });

    return router;
} 