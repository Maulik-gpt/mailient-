# AI Outreach Engine

A powerful, Apollo.io-like cold email outreach platform built into Mailient. This engine helps you find prospects, personalize emails at scale, and send campaigns directly through your Gmail account.

## 🚀 Features

### 1. AI Business Analyzer
- **URL Analysis**: Enter your product URL and AI extracts your business info
- **Auto-fill**: Automatically fills value proposition, target audience, industry
- **Smart Filters**: AI suggests optimal prospect filters based on your business

### 2. Global Prospect Search
- **700M+ Database**: Search through millions of professionals worldwide
- **Advanced Filters**:
  - Job Title (CEO, CTO, VP of Sales, etc.)
  - Company Name
  - Industry (SaaS, Fintech, Healthcare, etc.)
  - Location (City, Country)
  - Company Size (1-10 to 5000+)
  - Seniority Level (Entry to C-Level)
- **Email Verification**: Real-time email verification status

### 3. Lead List Management
- **Save Lists**: Create and manage multiple prospect lists
- **Export/Import**: CSV export and import functionality
- **Smart Selection**: Select all, filter by verified status

### 4. AI Email Writer
- **Personalization Variables**: {{name}}, {{company}}, {{jobTitle}}, etc.
- **Multiple Templates**: Value-first, Question-based, Social proof, Direct ask
- **A/B Testing**: Generate multiple variants for testing
- **Follow-up Sequences**: Auto-generated 3, 7, 14-day follow-ups

### 5. Campaign Management
- **Launch Campaigns**: Send personalized emails at scale
- **Status Tracking**: Draft, Active, Paused, Completed
- **Analytics Dashboard**: Opens, clicks, replies, bounces
- **Conversion Funnel**: Visual representation of campaign performance

## 📁 File Structure

```
app/
├── dashboard/outreach/
│   ├── page.tsx                    # Main outreach page
│   ├── layout.tsx                  # Layout with sidebar
│   └── campaign/[campaignId]/
│       └── page.tsx                # Campaign detail page
├── api/outreach/
│   ├── analyze-business/route.ts   # AI website analyzer
│   ├── search-prospects/route.ts   # Prospect search API
│   ├── generate-email/route.ts     # AI email generation
│   ├── send-campaign/route.ts      # Campaign sender
│   ├── verify-emails/route.ts      # Email verification
│   ├── find-by-domain/route.ts     # Domain-based search
│   ├── business-profile/route.ts   # User business profile
│   ├── lists/route.ts              # Prospect lists CRUD
│   ├── templates/route.ts          # Email templates
│   └── campaigns/
│       ├── route.ts                # Campaigns CRUD
│       └── [campaignId]/
│           ├── route.ts            # Single campaign
│           └── status/route.ts     # Status updates

components/outreach/
├── EmailPreview.tsx                # Email preview component
├── CampaignStatsCard.tsx           # Stats visualization
├── ProspectSearchFilters.tsx       # Search filter UI
├── ProspectsTable.tsx              # Prospects data table
└── index.ts                        # Exports

lib/
├── ai-email-writer.ts              # AI email service
├── prospect-search-service.ts      # Search service
└── outreach-export.ts              # CSV utilities
```

## 🗄️ Database Schema

Run `supabase-outreach-schema.sql` to create required tables:
- `prospect_lists` - Saved prospect lists
- `prospects` - Individual lead records
- `business_profiles` - User's business info for AI
- `outreach_campaigns` - Campaign configurations
- `campaign_emails` - Individual email tracking
- `email_templates` - Saved templates

## 🔌 API Integrations

### DataFast (Recommended)
Set `DATAFAST_API_KEY` in `.env.local` for real prospect data:
```env
DATAFAST_API_KEY=your_api_key_here
```

### OpenRouter AI
Already configured in your environment for AI analysis and email generation.

### Gmail API
Uses existing Gmail integration for sending emails through user's account.

## 📊 Usage Flow

1. **Setup Business Profile**
   - Enter your product URL
   - Click "Analyze with AI"
   - Review and adjust auto-filled information

2. **Search Prospects**
   - Apply AI-suggested filters or customize
   - Click "Search Prospects"
   - Select prospects for your campaign

3. **Generate Email**
   - Click "Generate Email"
   - AI creates personalized template
   - Preview with each prospect's data

4. **Launch Campaign**
   - Name your campaign
   - Review email template
   - Click "Launch Campaign"

5. **Track Performance**
   - Monitor sends, opens, replies
   - View conversion funnel
   - Pause/resume campaigns

## ⚙️ Configuration

### Environment Variables
```env
# Required
OPENROUTER_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Optional (for real data)
DATAFAST_API_KEY=your_key
```

### Gmail Sending Limits
- Default: 1 second delay between emails
- Daily limit: 500 emails for regular Gmail
- Rate limiting is built-in to avoid blocks

## 🎨 UI/UX

- Dark theme with gradient backgrounds
- Glassmorphism effects
- Framer Motion animations
- Responsive design
- Sonner toast notifications

## 🔒 Security

- Row-Level Security on all tables
- User authentication required
- Email tokens encrypted
- API rate limiting

## 📈 Roadmap

- [ ] LinkedIn integration
- [ ] Email tracking pixels
- [ ] A/B testing automation
- [ ] CRM integrations
- [ ] Team collaboration
- [ ] Email scheduling
