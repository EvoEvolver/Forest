import {Router} from 'express';
import {Pool} from 'pg';
import {config} from '../config/app';
import {createClient} from '@supabase/supabase-js';

// Initialize PostgreSQL pool with better error handling
let pool: Pool | null = null;
if (config.postgresDbUrl) {
    try {
        pool = new Pool({
            connectionString: config.postgresDbUrl,
        });
    } catch (error) {
        console.error('Failed to initialize PostgreSQL pool:', error);
    }
} else {
    console.warn('No PostgreSQL URL configured (SUPERBASE_PG_DB_URL)');
}

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

    // GET /user/metadata/:uid - Enhanced to fetch from Supabase
    // @ts-ignore - TypeScript configuration issue with router callback types
    router.get('/metadata/:uid', async (req, res) => {
        const {uid} = req.params;
        if (!uid) {
            return res.status(400).json({error: 'UID is required'});
        }
        
        try {
            let userData = null;
            
            // Try to get user data from Supabase first
            if (supabase) {
                try {
                    const { data: user, error } = await supabase.auth.admin.getUserById(uid);
                    
                    if (!error && user) {
                        userData = {
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
                    } else if (error) {
                        console.error('Failed to fetch user from Supabase:', error.message);
                    }
                } catch (supabaseError) {
                    console.error('Supabase error:', supabaseError);
                }
            }
            
            // Fallback to PostgreSQL query if Supabase fails or is not configured
            if (!userData && pool) {
                try {
                    const result = await pool.query(
                        'SELECT raw_user_meta_data, email FROM auth.users WHERE id = $1',
                        [uid]
                    );
                    
                    if (result.rows.length === 0) {
                        return res.status(404).json({error: 'User not found'});
                    }
                    
                    const row = result.rows[0];
                    const metadata = row.raw_user_meta_data;
                    const email = row.email;
                    
                    // Parse metadata if it's a string
                    const userMeta = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
                    
                    userData = {
                        userId: uid,
                        email: email || userMeta.email || undefined,
                        display_name: userMeta.display_name,
                        name: userMeta.name,
                        user_name: userMeta.user_name,
                        avatar_url: userMeta.avatar_url,
                        ...userMeta
                    };
                } catch (pgError) {
                    console.error('PostgreSQL error:', pgError);
                }
            }
            
            // If no data source is available, return a minimal response
            if (!userData) {
                userData = {
                    userId: uid,
                    email: undefined,
                    display_name: undefined,
                    name: undefined,
                    user_name: undefined,
                    avatar_url: undefined
                };
            }
            
            return res.json(userData);
            
        } catch (err) {
            console.error('Error querying user info:', err);
            return res.status(500).json({error: 'Database error'});
        }
    });

    return router;
}