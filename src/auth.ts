import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

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
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      // If Supabase is not configured, allow sign-in (for development)
      if (!supabaseAdmin) {
        console.warn('Supabase not configured. User authorization system disabled.');
        return true;
      }

      try {
        // Check if user exists in profiles table
        const { data: existingProfile, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is fine
          console.error('Error fetching profile:', fetchError);
          return false;
        }

        // If user doesn't exist, create a new profile with 'unauthorized' status
        if (!existingProfile) {
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
              email: user.email,
              name: user.name,
              image: user.image,
              status: 'unauthorized', // Default status for new users
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && session.user.email) {
        session.user.id = token.sub as string;

        // If Supabase is not configured, return session without status check
        if (!supabaseAdmin) {
          return session;
        }

        // Fetch user's status from database
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('status')
          .eq('email', session.user.email)
          .single();

        // Add status to session
        if (profile) {
          session.user.status = profile.status;
        }
      }
      return session;
    },
  },
});
