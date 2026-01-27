import express from 'express';
import {config} from '../config/app';

// Mount body parsers on a specific base path (e.g., '/api') to avoid
// unnecessarily parsing bodies for non-API routes.
export function setupBodyParser(app: express.Application | express.Router, basePath?: string): void {
    const use = basePath
        ? (mw: any) => (app as any).use(basePath, mw)
        : (mw: any) => (app as any).use(mw);

    use(express.json({limit: config.express.jsonLimit}));
    use(express.urlencoded({limit: config.express.urlencodedLimit}));
}
