import express, { Request, Response } from 'express';
import path from 'path';
import minimist from 'minimist'
import http from 'http';
import cors from 'cors';
const WebSocket = require('ws')
const setupWSConnection = require('./y-websocket/utils.cjs').setupWSConnection
import * as Y from 'yjs'
import {YMap} from "yjs/dist/src/types/YMap";
const getYDoc = require('./y-websocket/utils.cjs').getYDoc


class TreeData {
    nodeDict: { [key: string]: any };
    constructor() {
        this.nodeDict = {}
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

function patchTree(treeData: YMap<any>, patchTree: TreeData) {
    if (patchTree.nodeDict === null)
        return
    const nodeDict: YMap<any> = treeData.get("nodeDict")
    for (let key in patchTree.nodeDict) {
        const newNode = patchTree.nodeDict[key];
        if (newNode === null) {
            if (nodeDict.has(key)){
                nodeDict.delete(key)
            }
        } else {
            nodeDict.set(key, JSON.stringify(newNode))
        }
    }
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
    else{
        // forward the request to the frontend server running on port 39999
        app.get('/', (_req, res) => {
            res.redirect('http://0.0.0.0:39999');
        });
    }

    app.put('/api/updateTree', (req, res) => {
        console.log("update tree")
        const tree_patch = req.body.tree;
        const tree_id = req.body.tree_id;
        const doc = getYDoc(docname)
        const trees = doc.getMap("trees")
        let treeData: YMap<any>
        let nodeDict: YMap<any>
        if (!trees.has(tree_id)) {
            treeData = new Y.Map()
            trees.set(tree_id, treeData)
            nodeDict = new Y.Map()
            treeData.set("nodeDict", nodeDict)
        }
        else{
            treeData = trees.get(tree_id)
            nodeDict = treeData.get("nodeDict")
        }
        patchTree(treeData, tree_patch);
        res.send("OK");
    });

    app.get('/api/getTreeList', (_req, res) => {
        const ytreeJson = getYDoc(docname).getMap("trees").toJSON()
        const treeKeys = []
        for (let key in ytreeJson){
            treeKeys.push(key)
        }
        res.send(treeKeys);
    })

    app.get('/api/getTree', (req, res) => {
        const treeId: string = req.query.tree_id as string
        //const ytreeJson = getYDoc(docname).getMap("trees").toJSON()[treeId]
        if(!getYDoc(docname).getMap("trees").has(treeId)){
            res.send({})
            return
        }
        const ytreeJson = getYDoc(docname).getMap("trees").get(treeId).toJSON()
        const treeData = new TreeData()
        console.log("treeData", treeData)
        const nodeDict = ytreeJson["nodeDict"]
        console.log("nodeDict", nodeDict)
        for (let key in nodeDict){
            treeData.nodeDict[key] = JSON.parse(nodeDict[key])
        }
        const tree: Record<string, TreeData> = {}
        tree[treeId] = treeData
        res.send(tree);
    })

    app.get('/api/alive', (_req, res) => {
        res.send("OK")
    })

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