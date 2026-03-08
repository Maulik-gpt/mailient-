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

# Polar Payment Integration (CRITICAL for subscriptions)
# Get these from your Polar dashboard -> Settings -> Developer
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret
POLAR_ACCESS_TOKEN=your_polar_access_token # Used for direct verification fallback

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

## Polar Payment Setup

### Step 1: Create Polar Account
1. Go to [Polar](https://polar.sh/) and sign up
2. Create your organization/store
3. Create products for your subscription plans (Starter and Pro)

### Step 2: Get Your Polar Credentials
1. Go to Polar Dashboard → Settings → Developer
2. Create an Access Token (for API calls)
3. Copy it to your `.env.local` as `POLAR_ACCESS_TOKEN`

### Step 3: Set Up Webhooks
1. Go to Polar Dashboard → Settings → Webhooks
2. Add a new webhook endpoint: `https://yourdomain.com/api/subscription/webhook`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.active`
   - `subscription.canceled`
   - `checkout.completed`
   - `order.created`
4. Copy the webhook secret to your `.env.local` as `POLAR_WEBHOOK_SECRET`

### Step 4: Get Your Checkout Link
Your Polar checkout link format:
```
https://buy.polar.sh/polar_cl_XXXXXXXXXXXX
```
This is configured in `app/pricing/page.tsx` and `app/onboarding/sift-onboarding.tsx`.

## Testing Your Setup

After setting up your environment, you can test the webhook endpoint status by visiting:
```
GET /api/subscription/webhook
```

This will return the connection status and whether all required environment variables are set.

You can also test the debug endpoint:
```
GET /api/subscription/debug
```
(Requires being logged in)

## Troubleshooting

### Subscription not activating after payment
1. Check that `POLAR_WEBHOOK_SECRET` is set correctly
2. Verify the webhook is configured in Polar dashboard
3. Check server logs for webhook errors
4. Have user click "Verify My Payment" button on payment success page
5. Visit `/api/subscription/webhook` to verify database connection

### Supabase Connection Issues
1. Ensure `SUPABASE_URL` is the correct project URL (not localhost)
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is the service role key (NOT anon key)
3. The service role key starts with `eyJ...` and is much longer than the anon key
4. Check that `user_subscriptions` table exists (run the migration SQL)

### Polar API Issues
1. Ensure `POLAR_ACCESS_TOKEN` is set correctly
2. Verify the token has correct permissions
3. Check Polar dashboard for any account issues

## Important Notes

- The app uses NextAuth for authentication with secure database storage
- Gmail scopes are automatically handled
- User tokens and emails are stored securely in Supabase
- Row Level Security (RLS) ensures data privacy
- **Subscriptions are primarily activated via Polar webhook**
- Users can click "Verify My Payment" as a fallback if webhooks fail

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscription/webhook` | POST | Receives Polar webhooks |
| `/api/subscription/webhook` | GET | Check webhook status |
| `/api/subscription/verify` | POST | Direct verification fallback |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/subscription/status` | GET | Get subscription status |
| `/api/subscription/debug` | GET | Debug subscription issues |
