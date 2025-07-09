import { httpUrl } from "@forest/client/src/appState";

interface UserMetadata {
    userId: string;
    username: string;
    email?: string;
    avatar: string | null;
}

interface CacheEntry {
    data: UserMetadata;
    timestamp: number;
}

class UserMetadataCache {
    private cache = new Map<string, CacheEntry>();
    private readonly ttl: number;

    constructor(ttlInMinutes: number = 5) {
        this.ttl = ttlInMinutes * 60 * 1000; // Convert minutes to milliseconds
    }

    get(id: string): UserMetadata | null {
        const entry = this.cache.get(id);
        if (!entry) return null;

        // Check if the entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(id);
            return null;
        }

        return entry.data;
    }

    set(id: string, data: UserMetadata): void {
        this.cache.set(id, {
            data,
            timestamp: Date.now()
        });
    }

    clear(): void {
        this.cache.clear();
    }
}

// Create a singleton instance of the cache
const userMetadataCache = new UserMetadataCache();

export async function getUserMetadata(id: string) {
    // Try to get from cache first
    const cachedData = userMetadataCache.get(id);
    if (cachedData) {
        return cachedData;
    }

    try {
        const res = await fetch(`${httpUrl}/api/user/metadata/${id}`);
        if (!res.ok) throw new Error('User not found');
        const meta = await res.json();
        // meta may be a stringified object, parse if needed
        const userMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;

        const userData = {
            userId: id,
            username: userMeta.name || userMeta.user_name || userMeta.email?.split('@')[0] || id,
            email: userMeta.email || undefined,
            avatar: userMeta.avatar_url || null,
        };

        // Store in cache
        userMetadataCache.set(id, userData);

        return userData;
    } catch {
        const fallbackData = {userId: id, username: id, avatar: null};
        userMetadataCache.set(id, fallbackData);
        return fallbackData;
    }
}

export async function getUsername(id: string) {
    const userMeta = await getUserMetadata(id);
    return userMeta.username;
}