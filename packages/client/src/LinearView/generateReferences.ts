import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-csl';

const CACHE_KEY_PREFIX = 'zotero_response_';
const CACHE_EXPIRY_HOURS = 2400; // 100 days

function getCacheKey(url: string): string {
    return `${CACHE_KEY_PREFIX}${btoa(url)}`;
}

function getCachedResponse(url: string): any | null {
    try {
        const cacheKey = getCacheKey(url);
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        const {responseData, timestamp} = JSON.parse(cached);
        const now = Date.now();
        const expiryTime = timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

        if (now > expiryTime) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return responseData;
    } catch (error) {
        console.warn('Error reading from cache:', error);
        return null;
    }
}

function setCachedResponse(url: string, responseData: any): void {
    try {
        const cacheKey = getCacheKey(url);
        const cacheData = {
            responseData,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Error writing to cache:', error);
    }
}

export async function generateAPACitation(url: string): Promise<string> {
    try {
        // Check if URL has bib parameter
        const urlObj = new URL(url);
        const bibParam = urlObj.searchParams.get('bib');
        
        if (bibParam) {
            // Use BibTeX from parameter
            const decodedBibTeX = decodeURIComponent(bibParam);
            return await generateAPAFromBibTeX(decodedBibTeX, url);
        }

        // Convert arxiv.org/pdf links to arxiv.org/abs for better citation data
        let processedUrl = url;
        if (url.includes('arxiv.org/pdf/')) {
            processedUrl = url.replace('arxiv.org/pdf/', 'arxiv.org/abs/').replace('.pdf', '');
        }

        // Check cache first for regular URLs (use processed URL for cache key)
        const cachedResponse = getCachedResponse(processedUrl);
        if (cachedResponse) {
            const item = cachedResponse[0];
            return formatAPA(item, url);
        }

        const response = await fetch('https://zotero-matter.up.railway.app/web', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: processedUrl
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('No citation data found');
        }

        // Cache the raw server response (use processed URL for cache key)
        setCachedResponse(processedUrl, data);

        const item = data[0];
        return formatAPA(item, url);
    } catch (error) {
        console.error('Error generating APA citation:', error);
        throw error;
    }
}

async function generateAPAFromBibTeX(bibtex: string, originalUrl: string): Promise<string> {
    try {
        // Parse BibTeX using citation.js
        const cite = new Cite(bibtex);
        
        // Get the formatted APA citation
        const apaCitation = cite.format('bibliography', {
            format: 'text',
            template: 'apa',
            lang: 'en-US'
        });

        // Remove any trailing periods and newlines, then add a single period
        const cleanedCitation = apaCitation.trim().replace(/\.$/, '') + '.';
        
        console.log('Generated APA citation from BibTeX:', cleanedCitation);
        return cleanedCitation;
        
    } catch (error) {
        console.error('Error parsing BibTeX:', error);
        throw new Error(`Failed to parse BibTeX: ${error.message}`);
    }
}

function formatAPA(item: any, originalUrl: string): string {
    const {creators = [], title = '', date = '', itemType = '', url = '', repository = '', DOI = ''} = item;

    // Format authors
    let authorString = '';
    if (creators.length > 0) {
        if (creators.length === 1) {
            const author = creators[0];
            authorString = `${author.lastName}, ${author.firstName}`;
        } else if (creators.length <= 3) {
            const formattedAuthors = creators.map((author: any, index: number) => {
                if (index === 0) {
                    return `${author.lastName}, ${author.firstName}`;
                } else {
                    return `${author.firstName} ${author.lastName}`;
                }
            });
            authorString = formattedAuthors.join(', ');
        } else {
            const firstAuthor = creators[0];
            authorString = `${firstAuthor.lastName}, ${firstAuthor.firstName}, et al.`;
        }
    }

    // Format title with HTML
    const formattedTitle = title ? `"${title}"` : '';

    // Format publication info based on item type
    let publicationInfo = '';
    if (itemType === 'preprint' && repository) {
        publicationInfo = `${repository} preprint`;
        if (item.archiveID) {
            publicationInfo += ` ${item.archiveID}`;
        }
    } else if (itemType === 'webpage') {
        publicationInfo = 'Web';
    } else if (itemType === 'journalArticle') {
        publicationInfo = item.publicationTitle ? `${item.publicationTitle}` : '';
    }

    // Format date
    const year = date ? new Date(date).getFullYear() : '';
    const formattedDate = year ? `(${year})` : '';

    // Use the best available URL (prefer DOI, then original URL, then item URL)
    const linkUrl = DOI ? `https://doi.org/${DOI}` : (url || originalUrl);

    // Assemble citation with clickable link
    const parts = [
        authorString,
        formattedTitle,
        publicationInfo,
        formattedDate
    ].filter(Boolean);

    const citation = parts.join(' ') + '.';

    console.log('Generated APA citation:', citation);
    if (linkUrl) {
        return `${citation}`;
    }
    return citation;
}

