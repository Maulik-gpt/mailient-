# Google OAuth App Verification Guide

## The Issue
Your Google OAuth app is showing a security warning because it hasn't been verified by Google. This happens when apps request sensitive permissions like Gmail access.

## Why This Happens
- Apps requesting `gmail.modify` scope require verification
- Unverified apps show security warnings to users
- This is Google's way of protecting user data

## Solutions

### For Development/Testing
1. **Add Test Users** (Recommended for development):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "OAuth consent screen"
   - Add test user emails in the "Test users" section
   - Test users won't see the security warning

2. **Use Restricted Scopes** (If possible):
   - Consider `gmail.readonly` instead of `gmail.modify` for read-only access
   - But this may limit your app's functionality

### For Production
1. **Submit for Verification**:
   - Go to Google Cloud Console > APIs & Services > OAuth consent screen
   - Click "Submit for verification"
   - Provide required information:
     - App homepage URL
     - Privacy policy URL
     - Terms of service URL
     - Authorized domains
     - Business information

2. **Verification Requirements**:
   - Valid privacy policy and terms of service
   - Business email (not personal Gmail)
   - App must be production-ready
   - May take 2-4 weeks for review

## Current Configuration
- **Scopes**: `openid email profile https://www.googleapis.com/auth/gmail.modify`
- **App Email**: millionairemaulik@gmail.com
- **Status**: Unverified (shows security warning)

## Immediate Actions
1. Add yourself and team members as test users in Google Cloud Console
2. Create a privacy policy page for your app
3. Prepare business documentation for verification submission

## Code Changes Made
- Updated NextAuth to latest beta version
- Cleaned up OAuth configuration
- Improved error handling
- Added comprehensive documentation

The security warning will disappear for test users once added to the OAuth consent screen.