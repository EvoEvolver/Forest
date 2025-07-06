/*** Authentication related atoms ***/
import {Atom, atom, WritableAtom} from "jotai";
import {setupSupabaseClient} from "./supabase";
import {YjsProviderAtom} from "../TreeState/YjsConnection";
import {getPastelHexFromUsername, getRandomAnimal} from "./helper";
import {recordTreeVisit} from "../TreeState/treeVisitService";
import {treeId} from "../appState";
import {SupabaseClient} from "@supabase/supabase-js";

// Authentication related atoms
export interface User {
    id: string
    email: string

    [key: string]: any
}

// User authentication state
export const userAtom  = atom<User | null>(null)
// Auth token (JWT from Supabase)
export const authTokenAtom = atom<string | null>(null)
// Authentication status
export const isAuthenticatedAtom = atom((get) => {
    const user = get(userAtom)
    const token = get(authTokenAtom)
    return user !== null && token !== null
})
// Supabase client atom (will be initialized in App.tsx)
export const supabaseClientAtom: Atom<SupabaseClient> = atom<any>(null)
// Auth modal open state
export const authModalOpenAtom = atom(false)


// User permissions (draft)
export interface UserPermissions {
    canUseAI: boolean
    canUploadFiles: boolean
    maxFileSize: number // in MB
    // Future permissions can be added here
    [key: string]: any
}

export const userPermissionsAtom = atom<UserPermissions>({
    canUseAI: false,
    canUploadFiles: false,
    maxFileSize: 0
})

const subscriptionValueAtom = atom(null)

export const subscriptionAtom: WritableAtom<any, any, any> = atom((get) => {
    return get(subscriptionValueAtom);
}, async (get, set) => {
    // Initialize Supabase client in atom
    // @ts-ignore
    const supabaseClient = setupSupabaseClient()
    set(supabaseClientAtom, supabaseClient);
    if (!supabaseClient) {
        return
    }
    const awareness = get(YjsProviderAtom)?.awareness
    // Get current session on app startup (CRITICAL for session restoration)
    const initializeSession = async () => {
        try {
            const {data: {session}, error} = await supabaseClient.auth.getSession()
            if (error) {
                console.error('Error getting session:', error)
                return
            }

            if (session) {
                console.log('Restoring existing session:', session.user.email)
                // Restore existing session
                // @ts-ignore
                set(userAtom, {
                    id: session.user.id,
                    email: session.user.email || '',
                    ...session.user.user_metadata
                })
                // @ts-ignore
                set(authTokenAtom, session.access_token)
                set(userPermissionsAtom, {
                    canUseAI: true,
                    canUploadFiles: true,
                    maxFileSize: 10,
                })
            }
        } catch (error) {
            console.error('Error initializing session:', error)
        }
    }

    // Initialize session immediately
    initializeSession().then(() => {
        if (awareness) {
            const userEmail = get(userAtom)?.email || '';
            console.log('Setting awareness user state for:', userEmail);
            const username = userEmail?.split('@')[0] || 'Annonymous ' + getRandomAnimal(awareness.clientID)
            awareness.setLocalStateField("user", {"name": username, "color": getPastelHexFromUsername(username)});
        }
    }).then(() => {
        // Record visit when connection is established
        recordTreeVisit(treeId, supabaseClient);
    })

    // Set up auth state change listener
    const {data: {subscription}} = supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (session) {
            // User is signed in
            // @ts-ignore
            set(userAtom, {
                id: session.user.id,
                email: session.user.email || '',
                user_metadata: session.user.user_metadata,
                ...session.user.user_metadata
            });
            // @ts-ignore
            set(authTokenAtom, session.access_token);
            set(userPermissionsAtom, {
                canUseAI: true,
                canUploadFiles: true,
                maxFileSize: 10, // 10MB default
            });
        } else {
            // User is signed out
            // @ts-ignore
            set(userAtom, null);
            // @ts-ignore
            set(authTokenAtom, null);
            set(userPermissionsAtom, {
                canUseAI: false,
                canUploadFiles: false,
                maxFileSize: 0
            });
        }
    })
})