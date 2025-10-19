# Prophetic Orchestra 7.5 - AI Luxury Investment Advisor

A ChatGPT-like chatbot interface for luxury investment advice, built with Next.js 15 and featuring Google OAuth authentication with user authorization management.

## Features

- 🔐 **Secure Google Authentication** - OAuth 2.0 sign-in
- 🎫 **User Authorization System** - Waitlist management with database-backed access control
- 💬 **ChatGPT-style Interface** - Clean, intuitive chat experience
- 🎨 **Luxury Design** - Premium aesthetic with smooth animations
- 📱 **Responsive Layout** - Works on all devices
- 🔒 **Protected Routes** - Middleware-based authentication and authorization
- 👤 **User Profiles** - Display user info in sidebar
- 📊 **Database Integration** - Supabase for user management

## Tech Stack

- **Framework**: Next.js 15.3.2 with App Router
- **Authentication**: NextAuth.js v5 (beta) with Google Provider
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: Bun

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Google OAuth

**Important**: You need to configure Google OAuth before running the app. Follow the detailed guide in [SETUP_GOOGLE_AUTH.md](./SETUP_GOOGLE_AUTH.md).

Quick setup:
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth credentials
5. Copy `.env.local.example` to `.env.local` and add your credentials

### 3. Set Up Supabase Database

**Important**: You need to set up Supabase for user authorization. Follow the detailed guide in [SETUP_SUPABASE.md](./SETUP_SUPABASE.md).

Quick setup:
1. Create a [Supabase account](https://supabase.com)
2. Create a new project
3. Run the SQL script to create the `profiles` table
4. Copy your Supabase URL and API keys to `.env.local`

### 4. Run the Development Server

```bash
bun dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) to see the login page.

## Project Structure

```
prophetic-clone/
 src/
   ├── app/
   │   ├── api/auth/[...nextauth]/  # NextAuth API routes
   │   ├── login/                   # Login page
   │   ├── registration-pending/    # Waitlist page
   │   ├── page.tsx                 # Main chat interface
   │   ├── layout.tsx               # Root layout
   │   ├── providers.tsx            # SessionProvider wrapper
   │   └── globals.css              # Global styles
   ├── components/ui/               # shadcn/ui components
   ├── lib/
   │   ├── supabase.ts             # Supabase client config
   │   └── utils.ts                # Utility functions
   ├── types/
   │   └── next-auth.d.ts          # NextAuth type extensions
   ├── auth.ts                      # NextAuth configuration
   └── middleware.ts                # Route protection & authorization
 .env.local.example               # Environment variables template
 SETUP_GOOGLE_AUTH.md            # OAuth setup guide
 SETUP_SUPABASE.md               # Database setup guide
```

## Environment Variables

Required environment variables (create `.env.local`):

```env
# NextAuth
AUTH_SECRET=your-secret-key          # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Authorization Flow

1. **User signs in with Google** → Google OAuth authenticates the user
2. **Profile creation** → System checks if user exists in database:
   - New user → Creates profile with `status = 'unauthorized'`
   - Existing user → Loads existing profile
3. **Status check** → Middleware verifies authorization:
   - `status = 'unauthorized'` → Redirect to `/registration-pending` (waitlist page)
   - `status = 'authorized'` → Grant access to main chat interface
4. **Admin approval** → Manually change user status in Supabase dashboard
5. **User access** → User signs in again → Gets full access to the platform

## Managing User Access

To authorize users and grant them access:

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **profiles**
3. Find the user by email
4. Change `status` from `'unauthorized'` to `'authorized'`
5. User can now access the platform on their next sign-in

### Using SQL

```sql
-- Authorize a user
UPDATE profiles SET status = 'authorized' WHERE email = 'user@example.com';

-- View all unauthorized users (waitlist)
SELECT email, name, created_at FROM profiles WHERE status = 'unauthorized';
```

## Features Breakdown

### Authentication Flow
1. User visits any protected route → redirected to `/login`
2. Click "Continue with Google" → Google OAuth consent screen
3. After successful auth → Profile created/loaded from database
4. Status check:
   - Unauthorized → `/registration-pending` (waitlist)
   - Authorized → Main chat interface
5. Sign out from sidebar → back to login

### Chat Interface
- ChatGPT-style message bubbles
- Collapsible sidebar with chat history
- Example prompts for quick start
- Real-time message input with send button
- User profile display with Google avatar

### Design System
- **Colors**: Sky blue gradients, clean whites, elegant grays
- **Typography**: Geist Sans for modern, clean text
- **Components**: Custom shadcn/ui components with luxury styling
- **Animations**: Smooth transitions and hover effects

## Deployment

When deploying to production:

1. Update Google OAuth settings with production URLs
2. Create a production Supabase project
3. Set environment variables in your hosting platform
4. Update `NEXTAUTH_URL` to your production domain

Recommended platforms:
- [Vercel](https://vercel.com) (easiest for Next.js)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)

## Database Schema

The `profiles` table structure:

```sql
id          | uuid      | Primary key
email       | text      | Unique, not null
name        | text      | Nullable
image       | text      | Nullable
status      | text      | 'authorized' or 'unauthorized' (default)
created_at  | timestamp | Auto-generated
updated_at  | timestamp | Auto-updated
```

## Troubleshooting

### Authentication Issues
See [SETUP_GOOGLE_AUTH.md](./SETUP_GOOGLE_AUTH.md) for common OAuth problems.

### Database Issues
See [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) for Supabase troubleshooting.

### Common Problems

**Users stuck on waitlist after authorization**
- User needs to sign out and sign back in
- Check that status is exactly `'authorized'` (no spaces)
- Clear browser cookies

**Environment variables not working**
- Restart development server after changing `.env.local`
- Make sure file is named exactly `.env.local`
- Check for typos in variable names

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://authjs.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)

## License

MIT
