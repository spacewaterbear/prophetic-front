import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status?: 'unauthorized' | 'free' | 'paid' | 'admini';
    } & DefaultSession["user"]
  }

  interface User {
    status?: 'unauthorized' | 'free' | 'paid' | 'admini';
  }
}
