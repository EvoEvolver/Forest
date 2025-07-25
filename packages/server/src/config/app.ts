import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

export const config = {
    port: parseInt(process.env.BACKEND_PORT || '29999'),
    host: process.env.HOST || "0.0.0.0",
    frontendRoot: process.env.FRONTEND_ROOT || "./public/index.html",
    noFrontend: process.env.NO_FRONTEND === 'true',
    openaiApiKey: process.env.OPENAI_API_KEY,
    cors: {
        origin: [
            'http://localhost:39999',
            'http://localhost:29999',
            'https://treer.ai'
        ],
        credentials: true
    },
    express: {
        jsonLimit: '50mb',
        urlencodedLimit: '50mb'
    },
    postgresDbUrl: process.env.SUPERBASE_PG_DB_URL,
}; 