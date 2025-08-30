import {Cite} from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-csl';
import {NodeM} from "@forest/schema";

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

export async function getCitationBibtex(url: string): Promise<string> {
    try {
        // Check if URL has bib parameter
        const urlObj = new URL(url);
        const bibParam = urlObj.searchParams.get('bib');

        if (bibParam) {
            // Return BibTeX from parameter
            return decodeURIComponent(bibParam);
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
            return convertItemToBibtex(item);
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
        return convertItemToBibtex(item);
    } catch (error) {
        console.error('Error getting BibTeX citation:', error);
        throw error;
    }
}

function convertItemToBibtex(item: any): string {
    const {
        creators = [],
        title = '',
        date = '',
        itemType = '',
        url = '',
        repository = '',
        DOI = '',
        publicationTitle = '',
        archiveID = ''
    } = item;

    // Generate a unique key for the BibTeX entry
    const firstAuthorLastName = creators.length > 0 ? creators[0].lastName || 'Unknown' : 'Unknown';
    const year = date ? new Date(date).getFullYear() : 'n.d.';
    const key = `${firstAuthorLastName}${year}`;

    // Determine BibTeX entry type
    let entryType = 'misc';
    if (itemType === 'journalArticle') {
        entryType = 'article';
    } else if (itemType === 'preprint') {
        entryType = 'misc';
    } else if (itemType === 'webpage') {
        entryType = 'misc';
    }

    // Start building BibTeX entry
    let bibtex = `@${entryType}{${key},\n`;

    // Add title
    if (title) {
        bibtex += `  title={${title}},\n`;
    }

    // Add authors
    if (creators.length > 0) {
        const authorString = creators.map((creator: any) =>
            `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
        ).join(' and ');
        bibtex += `  author={${authorString}},\n`;
    }

    // Add year
    if (date) {
        bibtex += `  year={${year}},\n`;
    }

    // Add journal/publication info
    if (itemType === 'journalArticle' && publicationTitle) {
        bibtex += `  journal={${publicationTitle}},\n`;
    } else if (itemType === 'preprint' && repository) {
        bibtex += `  howpublished={${repository} preprint},\n`;
        if (archiveID) {
            bibtex += `  note={${archiveID}},\n`;
        }
    }

    // Add DOI or URL
    if (DOI) {
        bibtex += `  doi={${DOI}},\n`;
    } else if (url) {
        bibtex += `  url={${url}},\n`;
    }

    // Close the entry
    bibtex = bibtex.replace(/,\n$/, '\n') + '}';

    return bibtex;
}

export function formatAPAfromBibtex(bibtex: string): string {
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

export async function generateAPACitation(url: string): Promise<string> {
    try {
        // Check if URL has bib parameter
        const urlObj = new URL(url);
        const bibParam = urlObj.searchParams.get('bib');

        if (bibParam) {
            // Use BibTeX from parameter
            const decodedBibTeX = decodeURIComponent(bibParam);
            return formatAPAfromBibtex(decodedBibTeX);
        }

        // Get BibTeX and format to APA
        const bibtex = await getCitationBibtex(url);
        return formatAPAfromBibtex(bibtex);
    } catch (error) {
        console.error('Error generating APA citation:', error);
        throw error;
    }
}


export interface CitationResult {
    title: string;
    citation: string;
    hasError?: boolean;
    originalLink?: string;
    sourceNode?: NodeM;
}

export async function generateCitationsFromHTML(
    html: string,
    onProgress?: (current: number, total: number, errorCount: number) => void
): Promise<CitationResult[]> {
    // Parse HTML to find all <a> tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    const results: CitationResult[] = [];
    let errorCount = 0;
    const maxErrors = 10;

    // Process each link one by one
    for (let i = 0; i < links.length; i++) {
        // Stop if we've hit the error limit
        if (errorCount >= maxErrors) {
            console.warn(`Stopping citation generation after ${maxErrors} errors`);
            break;
        }

        const link = links[i];
        const href = link.getAttribute('href')?.trim();
        const title = link.innerHTML.trim();

        if (!href || !title) continue;

        // Skip non-http(s) URLs
        if (!href.startsWith('http://') && !href.startsWith('https://')) {
            continue;
        }

        try {

            const formattedCitation = await generateAPACitation(href);
            results.push({title, citation: formattedCitation, hasError: false, originalLink: href});

        } catch (error) {
            errorCount++;
            console.warn(`Failed to generate citation for ${href}:`, error);

            // Add entry with error message and mark as error
            results.push({
                title,
                citation: `Error generating citation for: ${href}`,
                hasError: true,
                originalLink: href
            });
        }

        // Call progress callback if provided
        if (onProgress) {
            onProgress(i + 1, links.length, errorCount);
        }
    }

    return results;
}