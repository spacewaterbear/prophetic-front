"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/",
        redirect: true
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="p-8 bg-white/80 backdrop-blur-xl border-gray-200 shadow-2xl">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl text-white font-light">P7</span>
            </div>
            <h1 className="text-3xl font-light mb-2">Prophetic Orchestra 7.5</h1>
            <p className="text-gray-600 text-sm">AI Luxury Investment Advisor</p>
          </div>

          {/* Welcome Message */}
          <div className="mb-8 text-center">
            <h2 className="text-xl font-light mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">
              Sign in to access your luxury investment insights
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm rounded-xl font-medium flex items-center justify-center gap-3"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Secure Authentication</span>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              Your data is encrypted and secure.
            </p>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>SOC 2 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
