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
import {issueRoutes, ReminderService} from '@forest/issue-tracker-server'
import { createUserRouter } from './routes/userRoutes';
import { createNodeSnapshotRouter } from './routes/nodeSnapshotRoutes';
import { metadataRoutes } from './routes/metadataRoutes';
import { createMongoCollectionRouter } from './routes/mongoCollectionRoutes';

// Import WebSocket handler
import {WebSocketHandler} from './websocket/websocketHandler';

// Import existing modules
import {setMongoConnection} from './mongoConnection';
import {setupYjsPersistence} from './y-websocket/utils';
import {TreeMetadataManager} from './services/treeMetadata';
import {TreeVisitManager} from './services/treeVisitTracker';
import {createTreePermissionRouter} from "./routes";
import apiProxyRouter from "./routes/apiProxyRouter.ts";
import mcpProxyRouter from "./routes/mcpProxyRouter";
import { imageRoutes } from './routes/imageRoutes';
import { initializeMinioService } from './services/minioService';

// Initialize services and connections
setMongoConnection();
setupYjsPersistence();

const treeMetadataManager = new TreeMetadataManager();
const treeVisitManager = new TreeVisitManager();

// Initialize services
const treeService = new TreeService(treeMetadataManager);

// Initialize WebSocket handler
const websocketHandler = new WebSocketHandler(treeMetadataManager);

// Initialize email reminder service
const reminderService = new ReminderService();

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
    app.use('/api/user', createUserRouter());
    app.use('/api', createNodeSnapshotRouter());
    app.use('/api/api-proxy', apiProxyRouter)
    app.use('/api/mcp-proxy', mcpProxyRouter);
    app.use('/api/images', imageRoutes);
    app.use('/api/metadata', metadataRoutes);
    app.use('/api/collections', createMongoCollectionRouter());

    // Start server
    server.listen(config.port, config.host, async () => {
        console.log(`Server running at http://${config.host}:${config.port}/`);
        
        // Initialize MinIO service
        await initializeMinioService();
        
        // Start daily reminders cron job
        reminderService.startDailyReminders();
        
        // // Trigger initial reminder check on startup
        // console.log('Triggering initial reminder check...');
        // try {
        //     await reminderService.triggerRemindersNow();
        //     console.log('Initial reminder check completed successfully');
        // } catch (error) {
        //     console.error('Initial reminder check failed:', error);
        // }
    });

    // Setup WebSocket upgrade handling
    server.on('upgrade', (request, socket, head) => {
        websocketHandler.handleUpgrade(request, socket, head);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('Process terminated');
            process.exit(0);
        });
    });

    process.on('SIGINT', async () => {
        console.log('SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('Process terminated');
            process.exit(0);
        });
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