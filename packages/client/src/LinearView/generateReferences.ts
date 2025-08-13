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

export async function generateMLACitation(url: string): Promise<string> {
    // Check cache first
    const cachedResponse = getCachedResponse(url);
    if (cachedResponse) {
        const item = cachedResponse[0];
        return formatMLA(item, url);
    }

    try {
        const response = await fetch('https://zotero-matter.up.railway.app/web', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: url
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('No citation data found');
        }

        // Cache the raw server response
        setCachedResponse(url, data);

        const item = data[0];
        return formatMLA(item, url);
    } catch (error) {
        console.error('Error generating MLA citation:', error);
        throw error;
    }
}

function formatMLA(item: any, originalUrl: string): string {
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

    console.log('Generated MLA citation:', citation);
    if (linkUrl) {
        return `${citation}`;
    }
    return citation;
}

export async function generateCitationsFromHTML(html: string): Promise<Array<{ title: string, citation: string }>> {
    // Parse HTML to find all <a> tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    const results: Array<{ title: string, citation: string }> = [];

    // Process each link
    for (const link of links) {
        const href = link.getAttribute('href').trim();
        const title = link.innerHTML.trim();

        if (!href || !title) continue;

        try {
            // Skip non-http(s) URLs
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
                continue;
            }

            const citation = await generateMLACitation(href);
            results.push({title, citation});
        } catch (error) {
            console.warn(`Failed to generate citation for ${href}:`, error);
            // Add entry with error message
            results.push({
                title,
                citation: `Error generating citation for: ${href}`
            });
        }
    }

    return results;
}