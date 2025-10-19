import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status?: 'authorized' | 'unauthorized';
    } & DefaultSession["user"]
  }

  interface User {
    status?: 'authorized' | 'unauthorized';
  }
}
