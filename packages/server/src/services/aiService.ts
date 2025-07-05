import OpenAI from 'openai';
import { config } from '../config/app';

export class AIService {
    private openai: OpenAI | null;

    constructor() {
        this.openai = config.openaiApiKey ? new OpenAI({
            apiKey: config.openaiApiKey,
        }) : null;
    }

    isAvailable(): boolean {
        return this.openai !== null;
    }

    async generateResponse(messages: any[]): Promise<string> {
        if (!this.openai) {
            throw new Error('AI service is not available. Please configure OpenAI API key.');
        }

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4.1-mini-2025-04-14',
            messages: messages,
        });

        return response.choices[0].message.content || '';
    }
}

export const aiService = new AIService(); 