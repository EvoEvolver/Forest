import { supabaseClientAtom } from "../UserSystem/authStates";
import { httpUrl } from "../appState";

// Record tree visit if user is authenticated
export async function recordTreeVisit(treeId: string, supabaseClient: any): Promise<void> {
    console.log("Recording tree visit for treeId:", treeId);
    console.log("Supabase client:", supabaseClient);
    if (!supabaseClient) return;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return;
        }
        console.log("Session:", session);
        if (!session) return;

        console.log("Session found:", session.user.email);
        
        await fetch(`${httpUrl}/api/recordTreeVisit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ treeId })
        });
    } catch (error) {
        console.error('Failed to record tree visit:', error);
    }
} 