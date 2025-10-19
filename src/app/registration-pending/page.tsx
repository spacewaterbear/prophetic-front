"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "next-auth/react";
import { Clock, Mail, Shield } from "lucide-react";

export default function RegistrationPendingPage() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <Card className="p-12 bg-white/80 backdrop-blur-xl border-gray-200 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Clock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-light mb-3">You're on Our Waitlist</h1>
            <p className="text-gray-600 text-lg">Thank you for your interest in Prophetic Orchestra 7.5</p>
          </div>

          {/* Main Message */}
          <div className="mb-10 text-center">
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-8 mb-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                Your registration has been received and is currently under review. 
                We will inform you via email when we grant you access to our exclusive 
                luxury investment platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-sky-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-sky-600" />
                </div>
                <h3 className="font-medium text-sm mb-1">Email Notification</h3>
                <p className="text-xs text-gray-600">You'll receive updates at your registered email</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-sm mb-1">Exclusive Access</h3>
                <p className="text-xs text-gray-600">Limited seats for premium members</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-medium text-sm mb-1">Review Process</h3>
                <p className="text-xs text-gray-600">Typically 1-3 business days</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-center space-y-8">
            <div className="py-4">

                <p className="text-sm text-gray-600">
                  Need to sign in with a different account?
                </p>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full max-w-xs mx-auto h-12 rounded-xl font-medium border-gray-300"
            >
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Questions? Contact us at{" "}
            <a href="mailto:support@propheticorchestra.com" className="text-sky-600 hover:text-sky-700 font-medium">
              support@propheticorchestra.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
