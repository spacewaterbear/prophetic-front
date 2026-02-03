"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { ShieldX, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function RestrictedAccessPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "https://chat.prophetic-orchestra.com";

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
                  ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_form_blanc.svg"
                  : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
                }
                alt="Prophetic Orchestra"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                suppressHydrationWarning
                priority
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-light mb-3 text-gray-900 dark:text-white">Restricted Environment</h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">This environment is not accessible with your account</p>
          </div>

          {/* Main Message */}
          <div className="mb-10 text-center">
            <div className="bg-[rgb(230,220,210)]/50 dark:bg-gray-700/50 rounded-2xl p-6 sm:p-8 mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 dark:bg-white/10 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-white dark:text-gray-300" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                You are trying to access a restricted environment reserved for administrators.
                Please use the production application instead.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-center space-y-4">
            <a
              href={productionUrl}
              className="block"
            >
              <Button
                className="w-full max-w-xs mx-auto h-12 rounded-xl font-medium bg-gray-800 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Production
              </Button>
            </a>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full max-w-xs mx-auto h-12 rounded-xl font-medium border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white transition-colors"
            >
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Production URL:{" "}
            <a href={productionUrl} className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-medium underline">
              {productionUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
