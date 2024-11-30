import express, { Request, Response } from 'express';
import path from 'path';
import minimist from 'minimist'
import http from 'http';
import cors from 'cors';
const WebSocket = require('ws')
const setupWSConnection = require('./y-websocket/utils.cjs').setupWSConnection
import * as Y from 'yjs'
const getYDoc = require('./y-websocket/utils.cjs').getYDoc


class TreeData {
    nodeDict: { [key: string]: any };
    constructor() {
        this.nodeDict = {}
    }
}


class TreeDoc {
    ydoc: Y.Doc
    nodeDict: Y.Map<string | null>
    constructor() {
        this.ydoc = new Y.Doc()
        this.nodeDict = this.ydoc.getMap("nodeDict")
        this.nodeDict.set("_selectedNode", null)
    }
    getSelectedNode(){
        return this.nodeDict.get("_selectedNode")
    }

    setSelectedNode(node_id: string) {
        this.nodeDict.set("_selectedNode", node_id)
    }

    removeNode(node_id: string){
        this.nodeDict.delete(node_id)
    }

}

class ServerData{
    trees: { [key: string]: TreeData };
    tree: TreeData | null
    tree_id: string | null
    constructor() {
        this.trees = {}
        this.tree = null
        this.tree_id = null
    }
}

function patchTree(currTree: TreeData | null, patchTree: TreeData): TreeData {
    if (currTree === null) {
        currTree = new TreeData()
    }
    if (patchTree.selectedNode !== null) {
        currTree.selectedNode = patchTree.selectedNode;
    }
    if (patchTree.nodeDict !== null) {
        for (const key in patchTree.nodeDict) {
            const newNode = patchTree.nodeDict[key];
            if (newNode === null) {
                if (key in currTree.nodeDict) {
                    delete currTree.nodeDict[key];
                }
            } else {
                if (!currTree.nodeDict) {
                    currTree.nodeDict = {};
                }
                currTree.nodeDict[key] = newNode;
            }
        }
    }
    return currTree;
}

function main(port: number, host: string, frontendRoot: string | null): void {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ noServer: true })
    const docname = "forest"

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

    app.put('/updateTree', (req, res) => {
        console.log("update tree")
        const tree_patch = req.body.tree;
        const tree_id = req.body.tree_id;
        const doc = getYDoc(docname)
        //const nodeDict = doc.getMap("trees").get(tree_id).get
        data.tree = patchTree(data.tree, tree_patch);
        data.tree_id = tree_id;
        data.trees[tree_id] = data.tree;
        doc.getMap("trees").set(tree_id, JSON.stringify(data.tree));
        res.send("OK");
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
const host = args.Host || "127.0.0.1"
const noFrontend = args.NoFrontend || false
if(noFrontend)
    frontendRoot = null

console.log(__dirname)

main(backendPort, host, frontendRoot)