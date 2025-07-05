import express from 'express';
import path from 'path';
import { config } from '../config/app';

export function setupStaticFiles(app: express.Application): void {
    console.log(`serving with frontendRoot: ${config.frontendRoot}`);
    
    if (config.frontendRoot) {
        app.use(express.static(path.join(__dirname, path.dirname(config.frontendRoot))));
        
        // Serve the main app for various routes
        app.get('/', (_req, res) => {
            res.sendFile(path.join(__dirname, config.frontendRoot));
        });
        
        app.get('/auth-success', (_req, res) => {
            res.sendFile(path.join(__dirname, config.frontendRoot));
        });
        
        app.get('/user', (_req, res) => {
            res.sendFile(path.join(__dirname, config.frontendRoot));
        });
    } else {
        console.log("No frontend root set, assuming dev mode");
        // Forward the request to the frontend server running on port 39999
        app.get('/', (_req, res) => {
            const query = _req.originalUrl.split('?')[1] || '';
            const redirectUrl = `http://0.0.0.0:39999${query ? '?' + query : ''}`;
            console.log(`redirecting to ${redirectUrl}`);
            res.redirect(redirectUrl);
        });
    }
} 