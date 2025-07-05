import express from 'express';
import { config } from '../config/app';

export function setupBodyParser(app: express.Application): void {
    app.use(express.json({ limit: config.express.jsonLimit }));
    app.use(express.urlencoded({ limit: config.express.urlencodedLimit }));
} 