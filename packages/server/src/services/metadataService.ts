import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebsiteMetadata {
    url: string;
    title: string;
    description: string;
    favicon: string;
}

export class MetadataService {
    private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds
    private static readonly MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2MB
    
    async fetchMetadata(url: string): Promise<WebsiteMetadata> {
        // Validate URL format
        if (!this.isValidUrl(url)) {
            throw new Error('Invalid URL format');
        }

        try {
            // Fetch the webpage content
            const response = await axios.get(url, {
                timeout: MetadataService.REQUEST_TIMEOUT,
                maxContentLength: MetadataService.MAX_CONTENT_LENGTH,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Forest-Bookmark-Bot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                }
            });

            // Parse HTML content
            const $ = cheerio.load(response.data);

            // Extract metadata
            const title = this.extractTitle($);
            const description = this.extractDescription($);
            const favicon = this.extractFavicon($, url);

            return {
                url,
                title,
                description,
                favicon
            };

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error('Request timeout - website took too long to respond');
                } else if (error.response?.status === 404) {
                    throw new Error('Website not found (404)');
                } else if (error.response?.status === 403) {
                    throw new Error('Access forbidden (403)');
                } else if (error.response?.status && error.response.status >= 500) {
                    throw new Error('Website server error');
                }
            }
            
            throw new Error(`Failed to fetch website metadata: ${error.message}`);
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    private extractTitle($: cheerio.CheerioAPI): string {
        // Try different title sources in order of preference
        let title = '';

        // 1. Open Graph title
        title = $('meta[property="og:title"]').attr('content') || '';
        if (title.trim()) return title.trim();

        // 2. Twitter title
        title = $('meta[name="twitter:title"]').attr('content') || '';
        if (title.trim()) return title.trim();

        // 3. Standard title tag
        title = $('title').text() || '';
        if (title.trim()) return title.trim();

        // 4. h1 as fallback
        title = $('h1').first().text() || '';
        if (title.trim()) return title.trim();

        return 'Untitled';
    }

    private extractDescription($: cheerio.CheerioAPI): string {
        // Try different description sources in order of preference
        let description = '';

        // 1. Open Graph description
        description = $('meta[property="og:description"]').attr('content') || '';
        if (description.trim()) return description.trim();

        // 2. Twitter description
        description = $('meta[name="twitter:description"]').attr('content') || '';
        if (description.trim()) return description.trim();

        // 3. Standard meta description
        description = $('meta[name="description"]').attr('content') || '';
        if (description.trim()) return description.trim();

        // 4. First paragraph as fallback
        description = $('p').first().text() || '';
        if (description.trim()) {
            // Limit description length
            const truncated = description.trim().substring(0, 200);
            return truncated.length < description.trim().length ? truncated + '...' : truncated;
        }

        return 'No description available';
    }

    private extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string {
        const urlObj = new URL(baseUrl);
        const baseOrigin = urlObj.origin;

        // Try different favicon sources in order of preference
        let faviconUrl = '';

        // 1. Apple touch icon (high quality)
        faviconUrl = $('link[rel="apple-touch-icon"]').attr('href') || '';
        if (faviconUrl) return this.resolveUrl(faviconUrl, baseOrigin);

        // 2. Icon with sizes (prefer 32x32 or 16x16)
        const iconWithSizes = $('link[rel="icon"][sizes]');
        if (iconWithSizes.length > 0) {
            // Look for 32x32 first, then 16x16
            let preferredIcon = iconWithSizes.filter('[sizes*="32x32"]').first().attr('href') ||
                               iconWithSizes.filter('[sizes*="16x16"]').first().attr('href') ||
                               iconWithSizes.first().attr('href');
            if (preferredIcon) return this.resolveUrl(preferredIcon, baseOrigin);
        }

        // 3. Standard favicon
        faviconUrl = $('link[rel="icon"]').attr('href') || '';
        if (faviconUrl) return this.resolveUrl(faviconUrl, baseOrigin);

        // 4. Shortcut icon
        faviconUrl = $('link[rel="shortcut icon"]').attr('href') || '';
        if (faviconUrl) return this.resolveUrl(faviconUrl, baseOrigin);

        // 5. Default favicon.ico at root
        return `${baseOrigin}/favicon.ico`;
    }

    private resolveUrl(url: string, baseUrl: string): string {
        try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            } else if (url.startsWith('//')) {
                return `https:${url}`;
            } else if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
            } else {
                return `${baseUrl}/${url}`;
            }
        } catch {
            return `${baseUrl}/favicon.ico`;
        }
    }
}