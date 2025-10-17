# Google OAuth Setup Instructions

This guide will help you set up Google OAuth for the Prophetic Orchestra 7.5 chatbot.

## Prerequisites
- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" → "New Project"
3. Enter project name: "Prophetic Orchestra" (or any name you prefer)
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Prophetic Orchestra 7.5
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. Skip the "Scopes" section (click "Save and Continue")
7. Add test users if needed (for development)
8. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: Prophetic Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - Your production URL (when deploying)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-domain.com/api/auth/callback/google` (for production)
5. Click "Create"
6. **Copy your Client ID and Client Secret** - you'll need these!

## Step 5: Configure Environment Variables

1. In your project root, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your credentials:
   ```env
   # Generate a secret key
   AUTH_SECRET=your-generated-secret-key

   # From Google Cloud Console
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here

   # Your app URL
   NEXTAUTH_URL=http://localhost:3000
   ```

3. Generate a secure `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as your `AUTH_SECRET`

## Step 6: Test the Authentication

1. Start your development server:
   ```bash
   bun dev
   ```

2. Navigate to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Sign in with your Google account
5. You should be redirected to the main chat interface!

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- No trailing slash
- Correct protocol (http vs https)

### "Error: NEXTAUTH_URL is not set"
- Make sure `.env.local` exists and contains `NEXTAUTH_URL=http://localhost:3000`
- Restart your development server after adding environment variables

### "Sign in error"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly copied
- Ensure there are no extra spaces or quotes in the `.env.local` file

## Production Deployment

When deploying to production:

1. Add your production domain to Google Cloud Console:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

2. Update environment variables in your hosting platform with production values

3. Update `NEXTAUTH_URL` to your production URL

## Security Notes

- Never commit `.env.local` to version control (it's in `.gitignore`)
- Keep your `GOOGLE_CLIENT_SECRET` and `AUTH_SECRET` secure
- Use different credentials for development and production
- Regularly rotate your secrets
