# Environment Configuration for Mailient

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Supabase Configuration
# NOTE: The app checks for both SUPABASE_* and NEXT_PUBLIC_SUPABASE_* versions
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Whop Payment Integration (CRITICAL for subscriptions)
WHOP_WEBHOOK_SECRET=your_whop_webhook_secret
# WHOP_API_KEY is required for "Verify My Payment" fallback feature
# Get this from your Whop dashboard -> Developer -> API Keys
WHOP_API_KEY=your_whop_api_key

# For production, update NEXTAUTH_URL to your actual domain:
# NEXTAUTH_URL=https://yourdomain.com
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add the following authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`

## Supabase Database Setup

1. Go to [Supabase](https://supabase.com/) and create a new project
2. In your Supabase project dashboard, go to the SQL Editor
3. Run the SQL schema from `supabase-schema.sql` in your project
4. **CRITICAL**: Run `supabase-subscriptions-migration.sql` to create subscription tables
5. Go to Settings > API to get your project URL, anon key, and service role key
6. Add the Supabase environment variables to your `.env.local` file

## Whop Webhook Setup (For Subscriptions)

1. Create an account at [Whop](https://whop.com/)
2. Go to your Whop dashboard > Developer Settings > Webhooks
3. Add a new webhook endpoint: `https://yourdomain.com/api/subscription/webhook`
4. Select the following events:
   - `membership.went_valid`
   - `membership.renewed`
   - `membership.went_invalid`
   - `membership.cancelled`
5. Copy the webhook secret and add it to your `.env.local` as `WHOP_WEBHOOK_SECRET`

## Testing Your Setup

After setting up your environment, you can test the Supabase connection by visiting:
```
GET /api/subscription/webhook
```

This will return the connection status and whether all required environment variables are set.

## Troubleshooting

### Subscription not activating after payment
1. Check that `WHOP_WEBHOOK_SECRET` is set correctly
2. Verify the webhook is configured in Whop dashboard
3. Check server logs for webhook errors
4. Visit `/api/subscription/webhook` to verify Supabase connection

### Supabase Connection Issues
1. Ensure `SUPABASE_URL` is the correct project URL (not localhost)
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is the service role key (NOT anon key)
3. The service role key starts with `eyJ...` and is much longer than the anon key
4. Check that `user_subscriptions` table exists (run the migration SQL)

## Important Notes

- The app now uses NextAuth for authentication with secure database storage
- Gmail scopes are automatically included in the NextAuth configuration
- User tokens and emails are stored securely in Supabase database
- Row Level Security (RLS) ensures users can only access their own data
- No more insecure localStorage or URL parameter token passing
- **Subscriptions are ONLY activated via Whop webhook** - client-side activation is blocked for security
