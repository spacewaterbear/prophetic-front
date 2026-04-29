# Prophetic Orchestra 7.5 - AI Luxury Investment Advisor

A ChatGPT-like chatbot interface for luxury investment advice, built with Next.js 15 and featuring Google OAuth authentication.

## Features

- 🔐 **Secure Google Authentication** - OAuth 2.0 sign-in
- 💬 **ChatGPT-style Interface** - Clean, intuitive chat experience
- 🎨 **Luxury Design** - Premium aesthetic with smooth animations
- 📱 **Responsive Layout** - Works on all devices
- 🔒 **Protected Routes** - Middleware-based authentication
- 👤 **User Profiles** - Display user info in sidebar

## Tech Stack

- **Framework**: Next.js 15.3.2 with App Router
- **Authentication**: NextAuth.js v5 (beta) with Google Provider
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

### 3. Run the Development Server

```bash
bun dev
```

### Test auth
```bash
npx playwright test e2e/auth.spec.ts
```

Open [http://localhost:3000/login](http://localhost:3000/login) to see the login page.

## Project Structure

```
prophetic-clone/
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/  # NextAuth API routes
│   │   ├── login/                   # Login page
│   │   ├── page.tsx                 # Main chat interface
│   │   ├── layout.tsx               # Root layout
│   │   ├── providers.tsx            # SessionProvider wrapper
│   │   └── globals.css              # Global styles
│   ├── components/ui/               # shadcn/ui components
│   ├── auth.ts                      # NextAuth configuration
│   └── middleware.ts                # Route protection
├── .env.local.example               # Environment variables template
└── SETUP_GOOGLE_AUTH.md            # OAuth setup guide
```

## Environment Variables

Required environment variables (create `.env.local`):

```env
AUTH_SECRET=your-secret-key          # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```


## Features Breakdown

### Authentication Flow
1. User visits any protected route → redirected to `/login`
2. Click "Continue with Google" → Google OAuth consent screen
3. After successful auth → redirected to main chat interface
4. Session persists across page reloads
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
2. Set environment variables in your hosting platform
3. Update `NEXTAUTH_URL` to your production domain


Recommended platforms:
- [Vercel](https://vercel.com) (easiest for Next.js)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)

## Troubleshooting


See [SETUP_GOOGLE_AUTH.md](./SETUP_GOOGLE_AUTH.md) for common authentication issues.


## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://authjs.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)



docker-compose --profile dev up prophetic-front-dev