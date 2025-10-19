# Quick Start Guide - Prophetic Orchestra 7.5

This is a quick reference guide to get your Prophetic Orchestra application up and running with user authorization.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Bun package manager installed
- ✅ Google account (for OAuth setup)
- ✅ Supabase account (for database)

## Setup Steps (5 minutes)

### 1. Install Dependencies (30 seconds)

```bash
cd prophetic-clone
bun install
```

### 2. Configure Google OAuth (2 minutes)

Follow [SETUP_GOOGLE_AUTH.md](./SETUP_GOOGLE_AUTH.md) to:
1. Create Google Cloud project
2. Enable Google+ API
3. Set up OAuth consent screen
4. Create OAuth credentials
5. Get your Client ID and Secret

### 3. Configure Supabase (2 minutes)

Follow [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) to:
1. Create Supabase project
2. Run the SQL script to create `profiles` table
3. Get your Project URL and API keys

### 4. Set Environment Variables (30 seconds)

Create `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all values:

```env
# Generate this:
AUTH_SECRET=run-openssl-rand-base64-32

# From Google Cloud Console:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Your app URL:
NEXTAUTH_URL=http://localhost:3000

# From Supabase Dashboard:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

To generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 5. Start Development Server (10 seconds)

```bash
bun dev
```

Open http://localhost:3000

## Testing the Flow

### First-Time User (Waitlist)

1. Visit http://localhost:3000
2. You'll be redirected to `/login`
3. Click "Continue with Google"
4. Sign in with your Google account
5. You'll be redirected to `/registration-pending` (waitlist page)
6. Check your Supabase database - you should see a new row in `profiles` with `status = 'unauthorized'`

### Authorize a User

**In Supabase Dashboard:**
1. Go to Table Editor → profiles
2. Find your user by email
3. Change `status` from `'unauthorized'` to `'authorized'`
4. Save the change

**Or use SQL:**
```sql
UPDATE profiles 
SET status = 'authorized' 
WHERE email = 'your-email@gmail.com';
```

### Authorized User Access

1. Sign out from the waitlist page
2. Sign in again
3. You'll now be redirected to the main chat interface ✅

## File Structure Overview

```
prophetic-clone/
 src/
   ├── app/
   │   ├── page.tsx                      # Main chat (authorized users only)
   │   ├── login/page.tsx                # Google sign-in page
   │   └── registration-pending/page.tsx # Waitlist page
   ├── lib/
   │   └── supabase.ts                   # Database client
   ├── auth.ts                           # NextAuth config + DB checks
   └── middleware.ts                     # Route protection logic
 .env.local                            # Your secrets (not in git)
 SETUP_GOOGLE_AUTH.md                 # OAuth setup guide
 SETUP_SUPABASE.md                    # Database setup guide
```

## How It Works

```

  User visits site                                           │

                   │
                   ▼

  Middleware checks authentication                           │
  Not logged in? → Redirect to /login                        │

                   │
                   ▼

  User signs in with Google OAuth                            │

                   │
                   ▼

  NextAuth callback checks Supabase profiles table           │
  • User doesn't exist? Create with status='unauthorized'    │
  • User exists? Load their profile                          │

                   │
                   ▼

  Middleware checks user status                              │
  • status='unauthorized' → /registration-pending            │
  • status='authorized' → Main chat interface ✅             │

```

## Managing Users

### View All Unauthorized Users (Waitlist)

```sql
SELECT email, name, created_at 
FROM profiles 
WHERE status = 'unauthorized' 
ORDER BY created_at DESC;
```

### View All Authorized Users

```sql
SELECT email, name, created_at 
FROM profiles 
WHERE status = 'authorized' 
ORDER BY created_at DESC;
```

### Authorize Multiple Users at Once

```sql
UPDATE profiles 
SET status = 'authorized' 
WHERE email IN (
  'user1@gmail.com',
  'user2@gmail.com',
  'user3@gmail.com'
);
```

### Revoke Access

```sql
UPDATE profiles 
SET status = 'unauthorized' 
WHERE email = 'user@example.com';
```

## Common Issues & Solutions

### ❌ "redirect_uri_mismatch" error
**Solution:** Make sure Google OAuth redirect URI is exactly:
`http://localhost:3000/api/auth/callback/google`

### ❌ "Could not find profiles table"
**Solution:** Run the SQL script in SETUP_SUPABASE.md Step 3

### ❌ User stuck on waitlist after authorization
**Solution:** User needs to sign out and sign back in

### ❌ Environment variables not loading
**Solution:** 
- Restart dev server: `Ctrl+C` then `bun dev`
- Check file is named exactly `.env.local`
- Make sure it's in the project root (same folder as `package.json`)

### ❌ "Invalid JWT" error
**Solution:** Make sure `AUTH_SECRET` is set in `.env.local`

## Next Steps

- ✅ Test the full authentication flow
- ✅ Authorize yourself in Supabase
- ✅ Test the main chat interface
- 📧 Set up email notifications for new registrations
- 🎨 Customize the waitlist page message
- 📊 Build an admin dashboard to manage users

## Support

- **Same Support**: support@same.new
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Docs**: https://supabase.com/docs
- **NextAuth Docs**: https://authjs.dev

---

**Ready to go?** Run `bun dev` and visit http://localhost:3000 🚀
