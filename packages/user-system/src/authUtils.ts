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

/**
 * Save the current URL to localStorage before login
 * This allows us to redirect back to the original page after authentication
 */
export function saveUrlBeforeLogin(): void {
    const currentUrl = window.location.href;
    localStorage.setItem('treer_pre_login_url', currentUrl);
    console.log('Saved pre-login URL:', currentUrl);
}

/**
 * Get the saved URL from before login
 * Returns null if no URL was saved
 */
export function getSavedUrlBeforeLogin(): string | null {
    return localStorage.getItem('treer_pre_login_url');
}

/**
 * Clear the saved URL from localStorage
 */
export function clearSavedUrlBeforeLogin(): void {
    localStorage.removeItem('treer_pre_login_url');
}

/**
 * Get the URL to redirect to after successful login
 * Returns the saved URL if it exists, otherwise returns the home page
 */
export function getRedirectUrlAfterLogin(): string {
    const savedUrl = getSavedUrlBeforeLogin();
    if (savedUrl) {
        // Validate that the saved URL is from the same origin for security
        try {
            const url = new URL(savedUrl);
            if (url.origin === window.location.origin) {
                return savedUrl;
            }
        } catch (error) {
            console.warn('Invalid saved URL:', savedUrl);
        }
    }
    
    // Fallback to home page
    return window.location.origin;
}

/**
 * Handle OAuth tokens from URL and set session
 * Processes tokens from URL hash and sets up authentication session
 */
export async function handleOAuthTokensFromUrl(supabaseClient: any): Promise<boolean> {
    if (!supabaseClient || !hasOAuthTokensInUrl()) {
        return false;
    }

    console.log('Processing OAuth tokens from URL hash...');
    const tokens = parseOAuthTokensFromHash();
    console.log('Parsed tokens:', {
        hasAccessToken: !!tokens?.access_token,
        hasRefreshToken: !!tokens?.refresh_token,
        expiresAt: tokens?.expires_at,
        expiresIn: tokens?.expires_in,
        tokenType: tokens?.token_type
    });

    if (tokens?.access_token && tokens?.refresh_token) {
        // Check if token is expired
        if (tokens.expires_at) {
            const expiresAt = parseInt(tokens.expires_at) * 1000; // Convert to milliseconds
            const now = Date.now();
            if (now >= expiresAt) {
                console.error('OAuth token has expired', {
                    expiresAt: new Date(expiresAt),
                    now: new Date(now)
                });
                clearOAuthTokensFromUrl();
                return false;
            }
            console.log('Token is valid, expires at:', new Date(expiresAt));
        }

        console.log('Setting session with tokens...');
        try {
            const {data, error} = await supabaseClient.auth.setSession({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            });

            if (error) {
                console.error('Error setting session from OAuth tokens:', error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    status: error.status
                });
                return false;
            } else if (data.session) {
                console.log('OAuth session established successfully:', data.session.user.email);
                // Clear tokens from URL
                clearOAuthTokensFromUrl();
                // Clear any saved pre-login URL since login was successful
                clearSavedUrlBeforeLogin();
                return true;
            } else {
                console.warn('No session returned from setSession');
                return false;
            }
        } catch (error) {
            console.error('Error processing OAuth tokens:', error);
            return false;
        }
    } else {
        console.error('Missing required tokens:', {
            hasAccessToken: !!tokens?.access_token,
            hasRefreshToken: !!tokens?.refresh_token
        });
        return false;
    }
}