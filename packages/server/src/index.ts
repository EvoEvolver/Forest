import express, {Response} from 'express';
import path from 'path';
import minimist from 'minimist'
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import {createNewTree} from "./createTree";
import {applyUpdate, Doc, encodeStateAsUpdate, Map as YMap} from 'yjs';
import {WebSocketServer} from 'ws';
import {getYDoc, setupWSConnection, setupYjsPersistence} from './y-websocket/utils'
import OpenAI from 'openai';
import * as dotenv from 'dotenv'

import {
    AuthenticatedRequest,
    authenticateToken,
    requireAIPermission,
    requireCreateTreePermission
} from './middleware/auth';
import {setMongoConnection} from "./mongoConnection";
import {TreeMetadataManager} from "./treeMetadata";
import {TreeVisitManager} from "./treeVisitTracker";
import {TreeJson, TreeM} from '@forest/schema';

dotenv.config({
    path: path.resolve(__dirname, '.env'),
})

setMongoConnection()
setupYjsPersistence()
const treeMetadataManager = new TreeMetadataManager();
const treeVisitManager = new TreeVisitManager();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = OPENAI_API_KEY ? new OpenAI({
    apiKey: OPENAI_API_KEY, // Make sure you use a secure method to store this
}) : null;

function check_and_upgrade(doc: Doc, treeId: string) {
    const metadata = doc.getMap("metadata");
    if (!doc.getMap("metadata").has("version")) {
        doc.getMap("metadata").set("version", "0.0.1");
    }
    if (!metadata.has("rootId")) {
        //metadata.set("rootId", treeId);
    } else {
        const rootId = metadata.get("rootId") as string
        const nodeDict = doc.getMap("nodeDict")
        const rootNode = nodeDict.get(rootId) as YMap<any>
        if (rootNode) {
            const title = rootNode.get("title")
            const nodeCount = nodeDict.size
            treeMetadataManager.updateTreeTitle(treeId, title)
            treeMetadataManager.updateNodeCount(treeId, nodeCount).catch(() => {})
        }
    }
}


function main(port: number, host: string, frontendRoot: string | null): void {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({noServer: true})

    wss.on('connection', (conn: any, req: any, opts: any) => {
        const treeId = (req.url || '').slice(1).split('?')[0]
        if (!treeId || treeId == "null") {
            // refuse the connection
            conn.close?.()
            return
        }
        console.log("ws connected:", treeId)
        const garbageCollect = true
        const doc = getYDoc(treeId, garbageCollect)

        // Calculate node count from the document
        const nodeDict = doc.getMap("nodeDict")
        const nodeCount = nodeDict.size

        // Update last accessed time and node count; do nothing if it fails
        treeMetadataManager.updateLastAccessedAndNodeCount(treeId, nodeCount).catch(() => {
        })

        setupWSConnection(conn, req, {
            doc: doc,
            gc: garbageCollect
        })
        // check if upgrade needed
        check_and_upgrade(doc, treeId)
    })

    app.use(cors());
    //app.use(express.json());
    app.use(express.json({limit: '50mb'}));
    app.use(express.urlencoded({limit: '50mb'}));

    console.log(`serving with frontendRoot: ${frontendRoot}`)
    if (frontendRoot) {
        app.use(express.static(path.join(__dirname, path.dirname(frontendRoot))));
        app.get('/', (_req, res) => {
            res.sendFile(path.join(__dirname, frontendRoot));
        });
        app.get('/auth-success', (_req, res) => {
            res.sendFile(path.join(__dirname, frontendRoot));
        });
        app.get('/user', (_req, res) => {
            res.sendFile(path.join(__dirname, frontendRoot));
        });
    } else {
        console.log("No frontend root set, assuming dev mode")
        // forward the request to the frontend server running on port 39999
        app.get('/', (_req, res) => {
            const query = _req.originalUrl.split('?')[1] || '';
            const redirectUrl = `http://0.0.0.0:39999${query ? '?' + query : ''}`;
            console.log(`redirecting to ${redirectUrl}`)
            res.redirect(redirectUrl);
        });
    }

    // Protected tree creation endpoint - requires authentication and tree creation permission
    app.put('/api/createTree', authenticateToken, requireCreateTreePermission, (req: AuthenticatedRequest, res) => {
        console.log(`🌳 Tree creation request from authenticated user: ${req.user?.email}`);
        try {
            const treeJson = req.body.tree as TreeJson
            const rootId = treeJson.metadata.rootId
            const tree: TreeM = createNewTree(treeJson);

            // update the metadata
            //@ts-ignore
            const root_title = tree.nodeDict.get(rootId).get("title")
            tree.ydoc.transact(() => {
                const metadata = tree.ydoc.getMap("metadata");
                metadata.set("version", "0.0.1");
            })
            console.log(`✅ Tree '${root_title}' created successfully: ${tree.id()} for user: ${req.user?.email}`);
            treeMetadataManager.createTree(tree.id(), req.user!.id, root_title).catch(() => {
            })
            res.json({tree_id: tree.id()});
        } catch (error) {
            console.error(`❌ Error creating tree for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'An error occurred while creating the tree.'});
        }
    });


    // Protected tree duplication endpoint - requires authentication and tree creation permission
    /*app.put('/api/duplicateTree', authenticateToken, requireCreateTreePermission, (req: AuthenticatedRequest, res) => {
        console.log(`🌳 Tree duplication request from authenticated user: ${req.user?.email}`);
        try {
            const originTreeId = req.body.origin_tree_id;
            const originDoc = getYDoc(originTreeId)
            console.log(`originDoc: ${JSON.stringify(originDoc)}`)
            // generate a new document ID string using uuid
            const newDocId = crypto.randomUUID();
            const newDoc = getYDoc(newDocId)
            const stateOrigin = encodeStateAsUpdate(originDoc)
            applyUpdate(newDoc, stateOrigin);
            const nodeDict = originDoc.getMap("nodeDict").toJSON();
            const metadata = originDoc.getMap("metadata").toJSON();
            const root_title = nodeDict[metadata.rootId].title;
            console.log(`root_title: ${root_title}`)
            console.log(`✅ Tree '${root_title}' duplicated successfully: ${originTreeId} -> ${newDocId} for user: ${req.user?.email}`);
            treeMetadataManager.createTree(newDocId, req.user?.id || '', root_title).catch(()=>{})
                .then(() => {
                    res.json({new_tree_id: newDocId});
                })
                .catch(error => {
                    console.error('Error creating tree:', error);
                    res.status(500).json({error: 'Failed to create tree'});
                });
        } catch (error) {
            console.error(`❌ Error duplicating tree for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'An error occurred while duplicating the tree.'});
        }
    });*/

    app.put('/api/duplicateTree', (req, res) => {
        const originTreeId = req.body.origin_tree_id;
        const originDoc = getYDoc(originTreeId)
        
        // Calculate node count from the original document
        const nodeDict = originDoc.getMap("nodeDict")
        const nodeCount = nodeDict.size
        
        // generate a new document ID string using uuid
        const newDocId = crypto.randomUUID();
        const newDoc = getYDoc(newDocId)
        const stateOrigin = encodeStateAsUpdate(originDoc)
        applyUpdate(newDoc, stateOrigin);
        
        console.log(`Tree duplicated: ${originTreeId} -> ${newDocId} with ${nodeCount} nodes`);
        
        // return the new document ID
        res.json({new_tree_id: newDocId});
    });


    app.get('/api/user/trees', authenticateToken, async (req: AuthenticatedRequest, res) => {
        console.log(`Fetching trees for user: ${req.user?.email}:${req.user?.id}`);
        try {
            const userTrees = await treeMetadataManager.getUserTrees(req.user!.id);
            res.json({trees: userTrees});
        } catch (error) {
            console.error(`Error fetching trees for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to fetch trees'});
        }
    });


    app.delete('/api/trees/:treeId', authenticateToken, (req: AuthenticatedRequest, res) => {
        const treeId = req.params.treeId;
        console.log(`Deleting tree ${treeId} for user: ${req.user?.email}`);

        try {
            // Check if the user is the owner of the tree
            if (!treeMetadataManager.isOwner(treeId, req.user!.id)) {
                res.status(403).json({error: 'You do not have permission to delete this tree.'});
            }

            // delete tree metadata
            const deleted = treeMetadataManager.deleteTree(treeId);

            if (deleted) {
                // TODO: Should also clear related Yjs data, now only remove from hashmap
                console.log(`Tree ${treeId} deleted successfully for user: ${req.user?.email}`);
                res.json({success: true});
            } else {
                res.status(404).json({error: 'Tree not found'});
            }
        } catch (error) {
            console.error(`Error deleting tree ${treeId} for user ${req.user?.email}:`, error);
            res.status(500).json({error: 'Failed to delete tree'});
        }
    });

    // Protected AI endpoint - requires authentication and AI permission
    app.post('/api/llm', authenticateToken, requireAIPermission, async (req: AuthenticatedRequest, res) => {
        console.log(`🤖 AI request from authenticated user: ${req.user?.email}`);
        
        // Check if OpenAI service is available
        if (!openai) {
            console.log(`❌ OpenAI service not available - no API key configured`);
            res.status(503).send({error: 'AI service is not available. Please configure OpenAI API key.'});
            return;
        }
        
        try {
            const messages = req.body.messages
            const response = await openai.chat.completions.create({
                model: 'gpt-4.1-mini-2025-04-14',
                // @ts-ignore
                messages: messages,
            });
            const result = response.choices[0].message.content;
            console.log(`✅ AI response generated for user: ${req.user?.email}`);
            res.send({result});

        } catch (error) {
            console.error(`❌ Error in /api/llm for user ${req.user?.email}:`, error);
            res.status(500).send({error: 'An error occurred while processing the request.'});
        }
    });

    // Protected endpoint to record tree visits
    app.post('/api/recordTreeVisit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // Get user's visited trees with full metadata - useful for history or recommendations
    app.get('/api/user/visitedTrees', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    app.delete('/api/user/visitedTrees/:treeId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    server.listen(port, host, () => {
        console.log(`Server running at http://${host}:${port}/`);
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('connection', ws, request)
        });
    });

}


const args = minimist(process.argv.slice(2));
// Access the port argument
let frontendRoot = args.FrontendRoot || "./public/index.html"
const backendPort = args.BackendPort || 29999
const host = args.Host || "0.0.0.0"
const noFrontend = args.noFrontend
if (noFrontend) {
    console.log("no frontend mode")
    frontendRoot = null
}

main(backendPort, host, frontendRoot)