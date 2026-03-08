# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your Mailient Next.js application. This integration includes client-side event tracking via `instrumentation-client.ts`, server-side tracking capability via `posthog-node`, and a reverse proxy configuration to ensure reliable event delivery even with ad blockers.

## Integration Summary

### Files Created
- `instrumentation-client.ts` - Client-side PostHog initialization with exception capture
- `lib/posthog-server.ts` - Server-side PostHog client for API routes and server components
- `posthog-setup-report.md` - This setup report

### Files Modified
- `next.config.ts` - Added reverse proxy rewrites for PostHog ingestion
- `app/onboarding/page.tsx` - Added user identification on login
- `app/onboarding/sift-onboarding.tsx` - Added onboarding completion tracking
- `.env.local` - Added PostHog environment variables

## Events Instrumented

| Event Name | Description | File |
|------------|-------------|------|
| `user_logged_in` | Fired when a user successfully authenticates and lands on onboarding | `app/onboarding/page.tsx` |
| `onboarding_completed` | Fired when a user completes the onboarding flow and selects a plan | `app/onboarding/sift-onboarding.tsx` |

### Event Properties

**user_logged_in:**
- `email` - User's email address

**onboarding_completed:**
- `plan` - Selected plan (free, starter, pro)
- `role` - User's selected role (founder, freelancer, student)
- `goals` - Array of selected goals
- `email` - User's email address

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/317621/dashboard/1291191) - Core analytics dashboard for Mailient

### Insights
- [User Logins Over Time](https://us.posthog.com/project/317621/insights/IggP0CkS) - Tracks daily user login events
- [Onboarding Completions](https://us.posthog.com/project/317621/insights/p5JcF0Nh) - Tracks users who completed onboarding
- [Login to Onboarding Conversion Funnel](https://us.posthog.com/project/317621/insights/uRLv3WXk) - Conversion funnel from login to onboarding completion
- [Onboarding Plans Selected](https://us.posthog.com/project/317621/insights/ZctRy6HW) - Breakdown of plan selections
- [User Roles Distribution](https://us.posthog.com/project/317621/insights/PBmFyiLp) - Breakdown of user roles

## Configuration Details

### Environment Variables
```
NEXT_PUBLIC_POSTHOG_KEY=phc_QPMrykdJsfYj00gvgHZtImrzNdkZ1zOBYSWFNTmbYZm
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Reverse Proxy
Events are proxied through `/ingest/*` to bypass ad blockers and improve data reliability.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
