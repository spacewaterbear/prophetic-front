import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";

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
      // On first sign in, determine the correct user ID
      if (account && profile && user.email) {
        try {
          const supabase = createAdminClient();

          // Store Google provider account ID for future token refreshes
          token.googleId = account.providerAccountId;

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
      // Auto-create/update user profile in Supabase
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
            // Profile exists - just update metadata
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                username: user.name || user.email.split("@")[0],
                avatar_url: user.image || null,
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

        // Fetch user's status from database
        try {
          const supabase = createAdminClient();

          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            session.user.status = profile.status;
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
