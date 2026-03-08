# Google Data Policy Compliance

This application is designed to comply with Google API Services User Data Policy regarding the use of Google user data with AI services.

## Compliance Architecture

### Privacy-Mode Implementation

Our application implements **privacy-mode AI processing** to ensure Google user data obtained via Gmail API is never used for training AI models:

1. **Privacy Mode Enforcement**: The `AIPolicyCompliance` class enables privacy mode for all AI requests
2. **Data Collection Opt-Out**: All AI requests include `X-OpenRouter-Data-Collection: opt-out` header
3. **User-Agent Identification**: Requests identify as `Mailient-Compliant/1.0` for auditability
4. **Full AI Functionality**: Users get complete AI assistance while preventing data training

### Environment Configuration

Set the following environment variable to enable compliance mode:

```
GOOGLE_DATA_POLICY_COMPLIANCE=true
```

When enabled:
- Google user data can be processed by AI for user assistance
- AI services are explicitly prohibited from using data for training
- All requests include privacy headers and opt-out directives
- Full compliance with Google's data protection policies

### Technical Implementation

The compliance system works by:

1. **Intercepting AI Requests**: All email processing requests apply privacy settings
2. **Privacy Headers**: Adding `X-OpenRouter-Data-Collection: opt-out` to prevent training
3. **Audit Trail**: User-Agent and logging ensure auditable compliance
4. **Maintained Functionality**: AI features work normally while protecting user data

### Verification for Google Cloud Console

This architecture ensures:
- ✅ Google user data is not used for training AI models
- ✅ Full AI functionality maintained for user benefit
- ✅ Explicit opt-out from data collection
- ✅ Auditable compliance with proper headers

The application can be safely verified and approved under Google's data protection policies while maintaining all AI features.
