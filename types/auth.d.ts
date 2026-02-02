// Type declarations for lib/auth.js
declare module '@/lib/auth' {
    interface Session {
        user?: {
            email?: string;
            name?: string;
            image?: string;
        };
        accessToken?: string;
        refreshToken?: string;
    }

    export function auth(): Promise<Session | null>;
    export function signIn(provider?: string, options?: any): Promise<any>;
    export function signOut(options?: any): Promise<any>;
    export const handlers: {
        GET: (req: Request) => Promise<Response>;
        POST: (req: Request) => Promise<Response>;
    };
}
