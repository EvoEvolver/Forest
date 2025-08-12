import {httpUrl} from "@forest/schema/src/config";

// Record tree visit if user is authenticated
export async function recordTreeVisit(treeId: string, supabaseClient: any): Promise<void> {
    if (!supabaseClient) return;

    try {
        const {data: {session}, error} = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return;
        }

        if (!session) return;

        await fetch(`${httpUrl}/api/recordTreeVisit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({treeId})
        });
    } catch (error) {
        console.error('Failed to record tree visit:', error);
    }
} 