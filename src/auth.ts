import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

// Generate a deterministic UUID v5 from Google account ID using Web Crypto API
// This ensures the same Google account always gets the same UUID
async function googleIdToUuid(googleId: string): Promise<string> {
  // Use Web Crypto API (Edge Runtime compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode(googleId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Format as UUID v5 (xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16), // Version 5
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.accessToken || !credentials?.refreshToken) {
          return null;
        }

        try {
          // Create a Supabase client and verify the token
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          // Set the session with the provided tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: credentials.accessToken as string,
            refresh_token: credentials.refreshToken as string,
          });

          if (error || !data.user) {
            console.error("[MagicLink Auth] Token verification failed:", error);
            return null;
          }

          const user = data.user;

          // Return user object that NextAuth will use
          return {
            id: user.id,
            email: user.email,
            name: user.email?.split("@")[0] || "User",
          };
        } catch (error) {
          console.error("[MagicLink Auth] Error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    pkceCodeVerifier: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
    nonce: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Handle magic link authentication (credentials provider)
      if (account?.provider === "magic-link" && user) {
        // For magic link, the user.id is already the Supabase user ID
        token.userId = user.id;
        token.email = user.email;
        token.provider = "magic-link";
        return token;
      }

      // On first sign in with Google, determine the correct user ID
      if (account && profile && user.email) {
        try {
          const supabase = createAdminClient();

          // Store Google provider account ID for future token refreshes
          token.googleId = account.providerAccountId;
          token.provider = "google";

          // Check if a profile with this email already exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("mail", user.email)
            .maybeSingle();

          if (existingProfile) {
            // Use existing profile's ID
            token.userId = existingProfile.id;
          } else {
            // Generate new UUID from Google ID
            token.userId = await googleIdToUuid(account.providerAccountId);
          }
        } catch (error) {
          console.error('[Auth] Error in JWT callback:', error);
          // Fallback to generated UUID
          token.googleId = account.providerAccountId;
          token.userId = await googleIdToUuid(account.providerAccountId);
        }
      }

      // On token refresh: regenerate userId from stored Google ID if needed
      // NEVER use token.sub as it's NextAuth's internal ID, not the Google ID
      if (!token.userId && token.googleId) {
        token.userId = await googleIdToUuid(token.googleId as string);
      }

      return token;
    },
    async signIn({ user, account, profile }) {
      // Handle magic link sign in - profile already created in callback API
      if (account?.provider === "magic-link") {
        // Profile is already created/updated via the /api/auth/magiclink/callback endpoint
        return true;
      }

      // Auto-create/update user profile in Supabase for Google sign in
      const googleId = account?.providerAccountId;

      if (googleId && user.email) {
        try {
          const supabase = createAdminClient();

          // Check if a profile with this email already exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("mail", user.email)
            .maybeSingle();

          if (existingProfile) {
            // Profile exists - update metadata and status
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                username: user.name || user.email.split("@")[0],
                avatar_url: user.image || null,
                status: "oracle",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingProfile.id);

            if (updateError) {
              console.error("Error updating profile:", updateError);
            }
          } else {
            // No existing profile - create new one with generated UUID
            const userId = await googleIdToUuid(googleId);

            const { error } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                mail: user.email,
                username: user.name || user.email.split("@")[0],
                avatar_url: user.image || null,
                status: "oracle",
                updated_at: new Date().toISOString(),
              });

            if (error) {
              console.error("Error creating profile:", error);
              // Don't block login if profile creation fails
            }
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Use the stable Google user ID stored in the token
        session.user.id = token.userId as string;

        // Fetch user's status and admin flag from database
        try {
          const supabase = createAdminClient();

          const { data: profile } = await supabase
            .from('profiles')
            .select('status, is_admin')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            session.user.status = profile.status;
            session.user.isAdmin = profile.is_admin ?? false;
          }
        } catch (error) {
          console.error('[Auth] Error fetching user status:', error);
        }
      }

      if (!session.user?.id) {
        console.error("[Auth] Session has no user ID! Token:", token);
      }

      return session;
    },
  },
});
