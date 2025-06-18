import express from 'express';
import path from 'path';
import minimist from 'minimist'
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import {patchTree, ServerData} from "./nodeFactory";
import {applyUpdate, Doc, encodeStateAsUpdate} from 'yjs';
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

dotenv.config({
    path: path.resolve(__dirname, '.env'),
})

setMongoConnection()
setupYjsPersistence()
const treeMetadataManager = new TreeMetadataManager();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure you use a secure method to store this
});

function check_and_upgrade(doc: Doc, treeId: string) {
    const metadata = doc.getMap("metadata");
    if (!doc.getMap("metadata").has("version")) {
        doc.getMap("metadata").set("version", "0.0.1");
    }
    if (!metadata.has("rootId")) {
        //metadata.set("rootId", treeId);
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

        // update last accessed time; do nothing if it fails
        treeMetadataManager.updateLastAccessed(treeId).catch(() => {
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
            const tree_patch = req.body.tree;
            const treeId = crypto.randomUUID();
            const rootId = req.body.root_id;
            if (!rootId) {
                res.status(400).json({error: 'root_id is required.'});
            }
            const doc = getYDoc(treeId)
            const nodeDict = doc.getMap("nodeDict")
            patchTree(nodeDict, tree_patch);
            // update the metadata
            //@ts-ignore
            const root_title = nodeDict.get(rootId).get("title")
            doc.transact(() => {
                const metadata = doc.getMap("metadata");
                metadata.set("rootId", rootId);
                metadata.set("version", "0.0.1");
            })
            console.log(`✅ Tree '${root_title}' created successfully: ${treeId} for user: ${req.user?.email}`);
            treeMetadataManager.createTree(treeId, req.user!.id, root_title).catch(() => {
            })
            res.json({tree_id: treeId});
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
        // generate a new document ID string using uuid
        const newDocId = crypto.randomUUID();
        const newDoc = getYDoc(newDocId)
        const stateOrigin = encodeStateAsUpdate(originDoc)
        applyUpdate(newDoc, stateOrigin);
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
        console.log(`🗑️ Deleting tree ${treeId} for user: ${req.user?.email}`);

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