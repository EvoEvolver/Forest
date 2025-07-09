import cors from 'cors';
import { config } from '../config/app';

export function setupCORS(app: any): void {
    app.use(cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
                callback(null, true);
            } else if (config.cors.origin.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: config.cors.credentials
    }));
}