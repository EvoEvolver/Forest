import express, {Response} from 'express';
import {PermissionType, TreeUserPermissionManager} from '../services/treeUserPermission';
import {AuthenticatedRequest} from '../middleware/auth';

export function createTreePermissionRouter() {
    const router = express.Router();
    const manager = new TreeUserPermissionManager();

    // Grant permission
    router.post('/grant', async (req: AuthenticatedRequest, res: Response) => {
        const {treeId, userId, permissionType} = req.body;
        console.log('grant permission', treeId, userId, permissionType);
        if (!treeId || !userId || !permissionType) {
            res.status(400).json({error: 'treeId, userId, and permissionType are required'});
            return;
        }
        try {
            await manager.grantPermission(treeId, userId, permissionType as PermissionType);
            res.json({success: true});
        } catch (err) {
            res.status(500).json({error: 'Failed to grant permission', details: err});
        }
    });

    // Revoke permission
    router.post('/revoke', async (req: AuthenticatedRequest, res: Response) => {
        const {treeId, userId} = req.body;
        if (!treeId || !userId) {
            res.status(400).json({error: 'treeId and userId are required'});
            return;
        }
        try {
            await manager.revokePermission(treeId, userId);
            res.json({success: true});
        } catch (err) {
            res.status(500).json({error: 'Failed to revoke permission', details: err});
        }
    });

// List all users and their permissions for a tree
    router.get('/tree/:treeId', async (req, res: Response) => {
        console.log('list permissions for tree');
        const {treeId} = req.params;
        try {
            const perms = await manager.listPermissionsForTree(treeId);
            res.json({permissions: perms});
        } catch (err) {
            res.status(500).json({error: 'Failed to list permissions', details: err});
        }
    });

    // List all trees a user has access to
    router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
        const {userId} = req.params;
        console.log('list permissions for user', userId);
        try {
            const perms = await manager.listPermissionsForUser(userId);
            console.log("perms",perms);
            res.json({permissions: perms});
        } catch (err) {
            res.status(500).json({error: 'Failed to list permissions', details: err});
        }
    });

// Get a user's permission for a tree
    router.get('/:treeId/:userId', async (req: AuthenticatedRequest, res: Response) => {
        console.log('list permissions for tree user');
        const {treeId, userId} = req.params;
        try {
            const perm = await manager.getPermission(treeId, userId);
            res.json({permission: perm});
        } catch (err) {
            res.status(500).json({error: 'Failed to get permission', details: err});
        }
    });

    // Check if a user has a specific permission type for a tree
    router.get('/has/:treeId/:userId/:permissionType', async (req: AuthenticatedRequest, res: Response) => {
        const {treeId, userId, permissionType} = req.params;
        try {
            const has = await manager.hasPermission(treeId, userId, permissionType as PermissionType);
            res.json({hasPermission: has});
        } catch (err) {
            res.status(500).json({error: 'Failed to check permission', details: err});
        }
    });

    return router;
}
