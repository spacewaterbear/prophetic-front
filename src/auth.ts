import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Auto-create/update user profile in Supabase
      if (user.id && user.email) {
        try {
          const supabase = createAdminClient();

          // Upsert the profile using admin client (bypasses RLS)
          const { error } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
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
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
});
