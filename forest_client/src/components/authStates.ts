/*** Authentication related atoms ***/
import {atom} from "jotai/index";

// Authentication related atoms
export interface User {
    id: string
    email: string

    [key: string]: any
}

// User authentication state
export const userAtom = atom<User | null>(null)
// Auth token (JWT from Supabase)
export const authTokenAtom = atom<string | null>(null)
// Authentication status
export const isAuthenticatedAtom = atom((get) => {
    const user = get(userAtom)
    const token = get(authTokenAtom)
    return user !== null && token !== null
})
// Supabase client atom (will be initialized in App.tsx)
export const supabaseClientAtom = atom<any>(null)
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