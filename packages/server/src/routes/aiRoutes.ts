import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken, requireAIPermission } from '../middleware/auth';
import { aiService } from '../services';

export function createAIRouter(): Router {
    const router = Router();

    // AI endpoint
    router.post('/llm', authenticateToken, requireAIPermission, async (req: AuthenticatedRequest, res) => {
        console.log(`🤖 AI request from authenticated user: ${req.user?.email}`);
        
        // Check if OpenAI service is available
        if (!aiService.isAvailable()) {
            console.log(`❌ OpenAI service not available - no API key configured`);
            res.status(503).send({ error: 'AI service is not available. Please configure OpenAI API key.' });
            return;
        }
        
        try {
            const messages = req.body.messages;
            const result = await aiService.generateResponse(messages);
            
            console.log(`✅ AI response generated for user: ${req.user?.email}`);
            res.send({ result });
        } catch (error) {
            console.error(`❌ Error in /api/llm for user ${req.user?.email}:`, error);
            res.status(500).send({ error: 'An error occurred while processing the request.' });
        }
    });

    return router;
} 