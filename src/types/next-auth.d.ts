import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status?: 'unauthorized' | 'free' | 'paid';
    } & DefaultSession["user"]
  }

  interface User {
    status?: 'unauthorized' | 'free' | 'paid';
  }
}
