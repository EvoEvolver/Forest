import { WebSocketServer } from 'ws';
import { Doc, Map as YMap } from 'yjs';
import { getYDoc, setupWSConnection } from '../y-websocket/utils';
import { TreeMetadataManager } from '../services/treeMetadata';

export class WebSocketHandler {
    private wss: WebSocketServer;
    private treeMetadataManager: TreeMetadataManager;

    constructor(treeMetadataManager: TreeMetadataManager) {
        this.treeMetadataManager = treeMetadataManager;
        this.wss = new WebSocketServer({ noServer: true });
        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers(): void {
        this.wss.on('connection', (conn: any, req: any, opts: any) => {
            const treeId = (req.url || '').slice(1).split('?')[0];
            if (!treeId || treeId == "null") {
                // refuse the connection
                conn.close?.();
                return;
            }
            
            console.log("ws connected:", treeId);
            const garbageCollect = true;
            const doc = getYDoc(treeId, garbageCollect);



            setupWSConnection(conn, req, {
                doc: doc,
                gc: garbageCollect
            });
            
            // Check if upgrade needed
            setTimeout(() => {
                this.checkAndUpgrade(doc, treeId);
            }, 3000);
        });
    }

    private checkAndUpgrade(doc: Doc, treeId: string): void {
        const metadata = doc.getMap("metadata");
        if (!doc.getMap("metadata").has("version")) {
            doc.getMap("metadata").set("version", "0.0.1");
        }
        
        if (!metadata.has("rootId")) {
            //metadata.set("rootId", treeId);
        } else {
            const rootId = metadata.get("rootId") as string;
            const nodeDict = doc.getMap("nodeDict");
            const rootNode = nodeDict.get(rootId) as YMap<any>;
            if (rootNode) {
                const title = rootNode.get("title");
                const nodeCount = nodeDict.size;
                this.treeMetadataManager.updateLastAccessed(treeId).catch(() => {});
                this.treeMetadataManager.updateTreeTitle(treeId, title);
                this.treeMetadataManager.updateNodeCount(treeId, nodeCount).catch(() => {});
            }
        }
    }

    getWebSocketServer(): WebSocketServer {
        return this.wss;
    }

    handleUpgrade(request: any, socket: any, head: any): void {
        this.wss.handleUpgrade(request, socket, head, (ws: any) => {
            this.wss.emit('connection', ws, request);
        });
    }
} 