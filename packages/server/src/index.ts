import express from 'express';
import http from 'http';
import minimist from 'minimist';

// Import configuration
import {config} from './config/app';

// Import middleware
import {setupCORS} from './middleware/cors';
import {setupBodyParser} from './middleware/bodyParser';
import {setupStaticFiles} from './middleware/staticFiles';
import cookieParser from 'cookie-parser';

// Import services
import {TreeService} from './services/treeService';

// Import routers
import {createTreeRouter} from './routes/treeRoutes';
import {createAIRouter} from './routes/aiRoutes';
import {createVisitRouter} from './routes/visitRoutes';
import {issueRoutes} from '@forest/issue-tracker-server'

// Import WebSocket handler
import {WebSocketHandler} from './websocket/websocketHandler';

// Import existing modules
import {setMongoConnection} from './mongoConnection';
import {setupYjsPersistence} from './y-websocket/utils';
import {TreeMetadataManager} from './services/treeMetadata';
import {TreeVisitManager} from './services/treeVisitTracker';
import {createTreePermissionRouter} from "./routes";

// Initialize services and connections
setMongoConnection();
setupYjsPersistence();

const treeMetadataManager = new TreeMetadataManager();
const treeVisitManager = new TreeVisitManager();

// Initialize services
const treeService = new TreeService(treeMetadataManager);

// Initialize WebSocket handler
const websocketHandler = new WebSocketHandler(treeMetadataManager);

function main(): void {
    const app = express();
    const server = http.createServer(app);

    // Setup middleware
    app.use(cookieParser());
    setupCORS(app);
    setupBodyParser(app);

    // Setup static files and frontend routing
    setupStaticFiles(app);

    // Setup API routes
    app.use('/api', createTreeRouter(treeService));
    app.use('/api', createAIRouter());
    app.use('/api', createVisitRouter(treeVisitManager, treeMetadataManager));
    app.use('/api/issues', issueRoutes)
    app.use('/api/tree-permission', createTreePermissionRouter())

    // Start server
    server.listen(config.port, config.host, () => {
        console.log(`Server running at http://${config.host}:${config.port}/`);
    });

    // Setup WebSocket upgrade handling
    server.on('upgrade', (request, socket, head) => {
        websocketHandler.handleUpgrade(request, socket, head);
    });
}

// Parse command line arguments
const args = minimist(process.argv.slice(2));

// Override config with command line arguments if provided
if (args.FrontendRoot) {
    config.frontendRoot = args.FrontendRoot;
}
if (args.BackendPort) {
    config.port = parseInt(args.BackendPort);
}
if (args.Host) {
    config.host = args.Host;
}
if (args.noFrontend) {
    console.log("no frontend mode");
    config.noFrontend = true;
    config.frontendRoot = null;
}

main();