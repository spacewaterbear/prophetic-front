import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

// Generate a deterministic UUID v5 from Google account ID
// This ensures the same Google account always gets the same UUID
function googleIdToUuid(googleId: string): string {
  // Use MD5 hash of Google ID to generate UUID
  const hash = createHash('md5').update(googleId).digest('hex');

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
      // On first sign in, store the stable Google user ID as UUID
      if (account && profile) {
        // Convert Google's providerAccountId to a deterministic UUID
        const googleId = account.providerAccountId;
        token.userId = googleIdToUuid(googleId);
        console.log(`[Auth] JWT callback - Google ID: ${googleId} -> UUID: ${token.userId}`);
      }
      // Persist userId across token refreshes
      if (!token.userId && token.sub) {
        // Fallback: convert token.sub to UUID if userId wasn't set
        token.userId = googleIdToUuid(token.sub);
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      // Auto-create/update user profile in Supabase
      // Convert Google ID to UUID format
      const googleId = account?.providerAccountId;

      if (googleId && user.email) {
        try {
          const supabase = createAdminClient();
          const userId = googleIdToUuid(googleId);

          console.log(`[Auth] SignIn - Google ID: ${googleId} -> UUID: ${userId} (${user.email})`);

          // Upsert the profile using admin client (bypasses RLS)
          const { error } = await supabase
            .from("profiles")
            .upsert({
              id: userId,
              username: user.name || user.email.split("@")[0],
              avatar_url: user.image || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "id"
            });

          if (error) {
            console.error("Error creating/updating profile:", error);
            // Don't block login if profile creation fails
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
        console.log(`[Auth] Session callback - userId: ${session.user.id}, email: ${session.user.email}`);
      }
      if (!session.user?.id) {
        console.error("[Auth] Session has no user ID! Token:", token);
      }
      return session;
    },
  },
});
