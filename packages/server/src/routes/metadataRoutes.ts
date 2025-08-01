import express, { Request, Response } from 'express';
import { MetadataService, WebsiteMetadata } from '../services/metadataService';

const router = express.Router();
const metadataService = new MetadataService();

// Cache to store recently fetched metadata (in-memory for simplicity)
const metadataCache = new Map<string, { data: WebsiteMetadata; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
/**
 * POST /api/metadata/fetch
 * Fetches metadata for a given URL
 * 
 * Request body: { url: string }
 * Response: { success: boolean, data?: WebsiteMetadata, error?: string }
 */
router.post('/fetch', async (req: Request, res: Response): Promise<void> => {
        try {
            const { url } = req.body;

        // Validate request
        if (!url || typeof url !== 'string') {
            res.status(400).json({
                success: false,
                error: 'URL is required and must be a string'
            });
            return;
        }

        // Check cache first
        const cached = metadataCache.get(url);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            res.json({
                success: true,
                data: cached.data
            });
            return;
        }

            // Fetch fresh metadata
            const metadata = await metadataService.fetchMetadata(url);

            // Cache the result
            metadataCache.set(url, {
                data: metadata,
                timestamp: Date.now()
            });

            // Clean up old cache entries (simple cleanup)
            if (metadataCache.size > 1000) {
                const now = Date.now();
                for (const [cachedUrl, cachedData] of metadataCache.entries()) {
                    if (now - cachedData.timestamp > CACHE_DURATION) {
                        metadataCache.delete(cachedUrl);
                    }
                }
            }

            res.json({
                success: true,
                data: metadata
            });

        } catch (error: any) {
            console.error('Metadata fetch error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch website metadata'
            });
        }
    });

/**
 * GET /api/metadata/health
 * Health check endpoint for metadata service
 */
router.get('/health', (req: Request, res: Response): void => {
    res.json({
        success: true,
        service: 'metadata',
        timestamp: new Date().toISOString(),
        cacheSize: metadataCache.size
    });
});

export { router as metadataRoutes };