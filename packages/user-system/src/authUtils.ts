/**
 * Utility functions for authentication handling
 */

export interface OAuthTokens {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    expires_in?: string;
    provider_token?: string;
    token_type?: string;
}

/**
 * Parse OAuth tokens from URL hash fragment
 * Handles URLs like: https://example.com/#access_token=...&refresh_token=...
 */
export function parseOAuthTokensFromHash(): OAuthTokens | null {
    const hash = window.location.hash;
    
    if (!hash || !hash.includes('access_token=')) {
        return null;
    }

    const params = new URLSearchParams(hash.substring(1)); // Remove the '#' prefix
    
    const tokens: OAuthTokens = {};
    
    // Extract all OAuth-related parameters
    if (params.has('access_token')) {
        tokens.access_token = params.get('access_token')!;
    }
    if (params.has('refresh_token')) {
        tokens.refresh_token = params.get('refresh_token')!;
    }
    if (params.has('expires_at')) {
        tokens.expires_at = params.get('expires_at')!;
    }
    if (params.has('expires_in')) {
        tokens.expires_in = params.get('expires_in')!;
    }
    if (params.has('provider_token')) {
        tokens.provider_token = params.get('provider_token')!;
    }
    if (params.has('token_type')) {
        tokens.token_type = params.get('token_type')!;
    }

    return Object.keys(tokens).length > 0 ? tokens : null;
}

/**
 * Clear OAuth tokens from URL hash without page reload
 */
export function clearOAuthTokensFromUrl(): void {
    if (window.location.hash) {
        // Remove hash from URL without page reload
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
        );
    }
}

/**
 * Check if current URL contains OAuth callback tokens
 */
export function hasOAuthTokensInUrl(): boolean {
    return window.location.hash.includes('access_token=');
}