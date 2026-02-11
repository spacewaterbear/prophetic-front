"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Clock, Mail, Shield } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";
import { useState, useEffect } from "react";

export default function RegistrationPendingPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-[rgb(247,240,232)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <Card className="p-8 sm:p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-300 dark:border-gray-700 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            {/* Icon Logo */}
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src={isDark
                  ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_form_blanc.svg"
                  : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                }
                alt="Prophetic Orchestra"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                suppressHydrationWarning
                priority
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-light mb-3 text-gray-900 dark:text-white">You're on Our Waitlist</h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">Thank you for your interest in Prophetic Orchestra</p>
          </div>

          {/* Main Message */}
          <div className="mb-10 text-center">
            <div className="bg-[rgb(230,220,210)]/50 dark:bg-gray-700/50 rounded-2xl p-6 sm:p-8 mb-6">
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                Your registration has been received and is currently under review.
                We will inform you via email when we grant you access to our exclusive
                luxury investment platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white dark:text-gray-300" />
                </div>
                <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Email Notification</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">You'll receive updates at your registered email</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white dark:text-gray-300" />
                </div>
                <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Exclusive Access</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Limited seats for premium members</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white dark:text-gray-300" />
                </div>
                <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Review Process</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Typically 1-3 business days</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-center space-y-8">
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need to sign in with a different account?
              </p>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full max-w-xs mx-auto h-12 rounded-xl font-medium border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white transition-colors"
            >
              {t('nav.signOut')}
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Questions? Contact us at{" "}
            <a href="mailto:support@propheticorchestra.com" className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-medium underline">
              support@propheticorchestra.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
