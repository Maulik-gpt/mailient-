/**
 * NextAuth API route handler
 * Handles all authentication requests (GET/POST) for all providers
 */

import { handlers } from "@/lib/auth.js";

export const { GET, POST } = handlers;

