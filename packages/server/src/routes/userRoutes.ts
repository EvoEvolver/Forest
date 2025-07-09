import {Router} from 'express';
import {Pool} from 'pg';
import {config} from '../config/app';

interface UserParams {
    uid: string;
}

interface UserResponse {
    email: string;
    displayName: string;
}

const pool = new Pool({
    connectionString: config.postgresDbUrl,
});

export function createUserRouter(): Router {
    const router = Router();

    // GET /user-info/:uid
    // @ts-ignore
    router.get('/metadata/:uid', async (req, res) => {
            const {uid} = req.params;
            if (!uid) {
                return res.status(400).json({error: 'UID is required'});
            }
            try {
                const result = await pool.query(
                    'SELECT raw_user_meta_data FROM auth.users WHERE id = $1',
                    [uid]
                );
                if (result.rows.length === 0) {
                    return res.status(404).json({error: 'User not found'});
                }
                const metadata = result.rows[0]["raw_user_meta_data"] as string | null;
                return res.json(metadata);
            } catch (err) {
                console.error('Error querying user info:', err);
                return res.status(500).json({error: 'Database error'});
            }
        }
    );

    return router;
}