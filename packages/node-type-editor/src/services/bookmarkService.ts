import axios from 'axios';
import { httpUrl } from '@forest/schema/src/config';

export interface WebsiteMetadata {
    url: string;
    title: string;
    description: string;
    favicon: string;
}

export interface BookmarkServiceResponse {
    success: boolean;
    data?: WebsiteMetadata;
    error?: string;
}

export class BookmarkService {
    private static readonly API_BASE_URL = `${httpUrl}/api/metadata`;
    private static instance: BookmarkService;

    // Simple in-memory cache for the session
    private cache = new Map<string, { data: WebsiteMetadata; timestamp: number }>();
    private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    static getInstance(): BookmarkService {
        if (!BookmarkService.instance) {
            BookmarkService.instance = new BookmarkService();
        }
        return BookmarkService.instance;
    }

    async fetchMetadata(url: string): Promise<WebsiteMetadata> {
        // Check cache first
        const cached = this.cache.get(url);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            const response = await axios.post<BookmarkServiceResponse>(`${BookmarkService.API_BASE_URL}/fetch`, {
                url
            });

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || 'Failed to fetch metadata');
            }

            const metadata = response.data.data;

            // Cache the result
            this.cache.set(url, {
                data: metadata,
                timestamp: Date.now()
            });

            return metadata;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || error.message;
                throw new Error(`Failed to fetch bookmark data: ${message}`);
            }
            throw error;
        }
    }

    // Utility method to check if URL is valid
    isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    // Utility method to detect URLs in text
    detectUrls(text: string): string[] {
        const urlPattern = /https?:\/\/[^\s<>"'\])}]+/gi;
        return text.match(urlPattern) || [];
    }

    // Clear cache (useful for testing or memory management)
    clearCache(): void {
        this.cache.clear();
    }

    // Get cache size (for debugging)
    getCacheSize(): number {
        return this.cache.size;
    }
}