"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";
import { useState, useEffect } from "react";
import { Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/constants/logos";

type MagicLinkStatus = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<MagicLinkStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setMagicLinkStatus("error");
      setErrorMessage(t("login.invalidEmail"));
      return;
    }

    setMagicLinkStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/magiclink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      setMagicLinkStatus("sent");
    } catch (error) {
      console.error("Magic link error:", error);
      setMagicLinkStatus("error");
      setErrorMessage(t("login.sendError"));
    }
  };

  const resetMagicLinkForm = () => {
    setMagicLinkStatus("idle");
    setEmail("");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="p-8 sm:p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-300 dark:border-gray-700 shadow-2xl">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            {/* Text Logo */}
            <div className="w-48 h-12 mx-auto mb-4">
              <Image
                src={
                  isDark
                    ? LOGO_DARK
                    : LOGO_LIGHT
                }
                alt="Prophetic Orchestra"
                width={192}
                height={48}
                className="w-full h-full object-contain"
                suppressHydrationWarning
                priority
              />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-light mb-2 text-gray-900 dark:text-white">
              {t('login.welcome')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm rounded-xl font-medium flex items-center justify-center gap-3 transition-colors"
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
            {t('login.continueWithGoogle')}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {t('login.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Magic Link Form */}
          {magicLinkStatus === "sent" ? (
            <div className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-1">
                {t('login.magicLinkSent')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-300 mb-4">
                {t('login.checkEmail')}
              </p>
              <Button
                variant="ghost"
                onClick={resetMagicLinkForm}
                className="text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
              >
                {t('login.tryAgain')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (magicLinkStatus === "error") {
                      setMagicLinkStatus("idle");
                      setErrorMessage("");
                    }
                  }}
                  className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={magicLinkStatus === "sending"}
                />
              </div>

              {magicLinkStatus === "error" && errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={magicLinkStatus === "sending" || !email}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {magicLinkStatus === "sending" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('login.sending')}
                  </>
                ) : (
                  <>
                    {t('login.sendMagicLink')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Secure Auth Badge */}
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {t('login.secureAuth')}
              </span>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('login.termsText')}
            </p>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{t('login.encryption')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{t('login.certified')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
