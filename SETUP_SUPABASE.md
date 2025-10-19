# Supabase Setup Instructions

This guide will help you set up Supabase for the Prophetic Orchestra 7.5 application with user authorization management.

## Prerequisites
- A Supabase account ([Sign up here](https://supabase.com))
- Google OAuth already configured (see [SETUP_GOOGLE_AUTH.md](./SETUP_GOOGLE_AUTH.md))

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: Prophetic Orchestra
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is fine for development
4. Click "Create new project"
5. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values (you'll need them later):
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - keep this secret!)

## Step 3: Create the Profiles Table

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the following SQL:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'unauthorized' CHECK (status IN ('authorized', 'unauthorized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::text = id::text OR email = current_setting('request.jwt.claims', true)::json->>'email');

-- Only allow inserts through service role (handled by NextAuth)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Only allow updates through service role
CREATE POLICY "Service role can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (true);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);
```

4. Click "Run" to execute the SQL
5. You should see "Success. No rows returned"

## Step 4: Verify the Table

1. Go to **Table Editor** in the left sidebar
2. You should see the `profiles` table
3. Click on it to view the schema:
   - `id` (uuid, primary key)
   - `email` (text, unique, not null)
   - `name` (text, nullable)
   - `image` (text, nullable)
   - `status` (text, not null, default: 'unauthorized')
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Step 5: Configure Environment Variables

1. In your project root, make sure `.env.local` exists (copy from `.env.local.example` if needed):
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   # ... existing NextAuth variables ...

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. Replace the placeholders with your actual values from Step 2

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   bun dev
   ```

2. Navigate to `http://localhost:3000/login`
3. Sign in with Google
4. After successful sign-in, you should be redirected to `/registration-pending`
5. Check your Supabase table:
   - Go to **Table Editor** → **profiles**
   - You should see a new row with your email and status = 'unauthorized'

## Step 7: Authorize Users

To grant access to users, you need to update their status in the database:

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to **Table Editor** → **profiles**
2. Find the user you want to authorize
3. Click on the `status` cell for that user
4. Change it from `unauthorized` to `authorized`
5. Click the checkmark to save
6. The user will now have access when they log in

### Method 2: Using SQL Editor

```sql
-- Authorize a specific user by email
UPDATE public.profiles
SET status = 'authorized'
WHERE email = 'user@example.com';

-- Authorize multiple users
UPDATE public.profiles
SET status = 'authorized'
WHERE email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');

-- View all unauthorized users
SELECT email, name, created_at
FROM public.profiles
WHERE status = 'unauthorized'
ORDER BY created_at DESC;

-- View all authorized users
SELECT email, name, created_at
FROM public.profiles
WHERE status = 'authorized'
ORDER BY created_at DESC;
```

## Authorization Flow

Here's how the authorization system works:

1. **User signs in with Google** → Google OAuth authenticates the user
2. **Profile creation** → System checks if user exists in `profiles` table:
   - If user doesn't exist → Create new profile with `status = 'unauthorized'`
   - If user exists → Use existing profile
3. **Status check** → Middleware checks user's status:
   - If `status = 'unauthorized'` → Redirect to `/registration-pending`
   - If `status = 'authorized'` → Allow access to main chat interface
4. **Email notification** → When you authorize a user, send them an email to let them know
5. **User returns** → User refreshes or logs in again → Gets access to the platform

## Security Notes

- ✅ **Row Level Security (RLS)** is enabled on the profiles table
- ✅ Users can only read their own profile data
- ✅ Only the service role (your backend) can insert or update profiles
- ✅ The `service_role` key should NEVER be exposed to the client
- ✅ Always use the `anon` key for client-side operations
- ⚠️ Never commit `.env.local` to version control (it's in `.gitignore`)

## Troubleshooting

### "Error: Could not find profiles table"
- Make sure you ran the SQL script in Step 3
- Check that the table exists in Table Editor
- Verify you're using the correct project URL

### "Error: Permission denied for table profiles"
- Check that RLS policies are correctly set up
- Verify you're using the service role key for backend operations
- Try disabling and re-enabling RLS

### Users stuck on registration pending page after authorization
- Make sure the user signs out and signs back in after being authorized
- Check that the `status` field is exactly `'authorized'` (no extra spaces)
- Clear browser cookies and try again

### "Error: Invalid JWT"
- Check that your `AUTH_SECRET` is properly set in `.env.local`
- Verify that your Supabase credentials are correct
- Restart your development server after changing environment variables

## Production Deployment

When deploying to production:

1. Create a separate Supabase project for production
2. Run the same SQL script to create the profiles table
3. Update your environment variables in your hosting platform
4. Set up email notifications for new user registrations
5. Consider creating an admin dashboard to manage user authorizations

## Next Steps

- Set up email notifications when users register
- Create an admin dashboard to manage user access
- Add additional user fields (subscription tier, preferences, etc.)
- Implement rate limiting for unauthorized users
- Add analytics to track user registrations

## Support

For issues with Supabase setup:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [Same Support](mailto:support@same.new)
