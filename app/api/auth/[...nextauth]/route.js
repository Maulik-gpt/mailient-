/**
 * NextAuth API route handler
 * Handles all authentication requests (GET/POST) for all providers
 */

console.log('🔐 Auth route loading...');

import { handlers } from "@/lib/auth.js";

console.log('🔐 Handlers imported:', { GET: !!handlers.GET, POST: !!handlers.POST });

export const { GET, POST } = handlers;

