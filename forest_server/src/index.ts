import express from 'express';
import path from 'path';
import minimist from 'minimist'
import http from 'http';
import cors from 'cors';
import {patchTree, ServerData} from "./nodeFactory";

import { WebSocketServer } from 'ws';
// @ts-ignore
import {setupWSConnection} from './y-websocket/utils.ts'
// @ts-ignore
import {getYDoc} from "./y-websocket/utils.ts";
import OpenAI from 'openai';
import * as dotenv from 'dotenv'
dotenv.config({
  path: path.resolve(__dirname, '.env'),
})

// Import authentication middleware
import { authenticateToken, requireAIPermission, AuthenticatedRequest } from './middleware/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure you use a secure method to store this
});

function main(port: number, host: string, frontendRoot: string | null): void {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ noServer: true })
    //const docname = "forest"

    wss.on('connection', (conn: any, req: any, opts: any)=>{
        setupWSConnection(conn, req, opts)
    })

    app.use(cors());
    //app.use(express.json());
    app.use(express.json({limit: '50mb'}));
    app.use(express.urlencoded({limit: '50mb'}));

    const data: ServerData = new ServerData();

    if (frontendRoot){
        app.use(express.static(path.join(__dirname, path.dirname(frontendRoot))));
        app.get('/', (_req, res) => {
            res.sendFile(path.join(__dirname, frontendRoot));
        });
    }
    else{
        // forward the request to the frontend server running on port 39999
        app.get('/', (_req, res) => {
            res.redirect('http://0.0.0.0:39999');
        });
    }

    app.put('/api/updateTree', (req, res) => {
        const tree_patch = req.body.tree;
        const treeId = req.body.tree_id;
        const doc = getYDoc(treeId)
        const nodeDict = doc.getMap("nodeDict")
        patchTree(nodeDict, tree_patch);
        console.log("update tree", req.body.tree_id)
        res.send("OK");
    });

    app.get('/api/getTree', (req, res) => {
        const treeId: string = req.query.tree_id as string
        const ytreeJson = getYDoc(treeId).getMap("treeData").toJSON()
        console.log("getTree", ytreeJson)
        res.send(ytreeJson)
    })

    app.get('/api/alive', (_req, res) => {
        res.send("OK")
    })

    // Test endpoint for authentication - no auth required
    app.get('/api/test/public', (_req, res) => {
        res.json({ 
            message: "✅ Public endpoint working", 
            timestamp: new Date().toISOString() 
        });
    });

    // Test endpoint for authentication - auth required
    app.get('/api/test/protected', authenticateToken, (req: AuthenticatedRequest, res) => {
        res.json({ 
            message: "🔐 Protected endpoint working", 
            user: req.user,
            timestamp: new Date().toISOString() 
        });
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
            res.send({ result });
        } catch (error) {
            console.error(`❌ Error in /api/llm for user ${req.user?.email}:`, error);
            res.status(500).send({ error: 'An error occurred while processing the request.' });
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
const noFrontend = args.NoFrontend || false
if(noFrontend)
    frontendRoot = null

console.log(__dirname)

main(backendPort, host, frontendRoot)