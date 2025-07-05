import cors from 'cors';
import { config } from '../config/app';

export function setupCORS(app: any): void {
    app.use(cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials
    }));
} 