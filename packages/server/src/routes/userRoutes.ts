import {Router} from 'express';
import {createClient} from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
}) : null;

if (!supabase) {
    console.warn('Supabase client not initialized - missing configuration');
}

export function createUserRouter(): Router {
    const router = Router();

    // GET /user/metadata/:uid - Fetch from Supabase
    // @ts-ignore - TypeScript configuration issue with router callback types
    router.get('/metadata/:uid', async (req, res) => {
        const {uid} = req.params;
        if (!uid) {
            return res.status(400).json({error: 'UID is required'});
        }
        
        try {
            if (!supabase) {
                return res.status(500).json({error: 'Supabase client not initialized'});
            }

            const { data: user, error } = await supabase.auth.admin.getUserById(uid);
            
            if (error) {
                console.error('Failed to fetch user from Supabase:', error.message);
                return res.status(500).json({error: 'Failed to fetch user data'});
            }

            if (!user) {
                return res.status(404).json({error: 'User not found'});
            }

            const userData = {
                userId: uid,
                email: user.user?.email || undefined,
                // Priority: display_name > name > user_name > email prefix > fallback to id
                display_name: user.user?.user_metadata?.display_name,
                name: user.user?.user_metadata?.name,
                user_name: user.user?.user_metadata?.user_name,
                avatar_url: user.user?.user_metadata?.avatar_url,
                // Include all user metadata for completeness
                ...user.user?.user_metadata
            };
            
            return res.json(userData);
            
        } catch (err) {
            console.error('Error fetching user info:', err);
            return res.status(500).json({error: 'Server error'});
        }
    });

    return router;
}