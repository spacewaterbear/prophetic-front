"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";
import { useState, useEffect } from "react";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";

type MagicLinkStatus = "idle" | "sending" | "sent" | "error";
type RegistrationStep = "none" | "collecting_info";

interface MagicLinkUserInfo {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<MagicLinkStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(false);
  const router = useRouter();

  // New user registration state
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>("none");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pendingUserInfo, setPendingUserInfo] = useState<MagicLinkUserInfo | null>(null);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  // Handle magic link callback from URL hash (implicit flow)
  useEffect(() => {
    const handleMagicLinkCallback = async () => {
      // Check if we have hash params from magic link
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      console.log("[MagicLink] Hash detected:", hash ? "yes" : "no");

      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        console.log("[MagicLink] Type:", type, "Has tokens:", !!accessToken && !!refreshToken);

        // Handle both magiclink (existing user) and signup (new user confirmation)
        if (accessToken && refreshToken && (type === "magiclink" || type === "signup" || type === "email")) {
          setIsProcessingMagicLink(true);

          try {
            // Decode the JWT to get user info
            const tokenPayload = JSON.parse(atob(accessToken.split(".")[1]));
            const userId = tokenPayload.sub;
            const userEmail = tokenPayload.email;
            console.log("[MagicLink] User:", userEmail, "ID:", userId);

            // Clear the hash from URL
            window.history.replaceState(null, "", window.location.pathname);

            // Check if user profile exists and get their status
            const checkResponse = await fetch("/api/auth/magiclink/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, email: userEmail }),
            });

            const checkData = await checkResponse.json();
            console.log("[MagicLink] Check result:", checkData);

            if (checkData.exists && checkData.registrationComplete) {
              // User exists and has completed registration - sign them in
              const result = await signIn("magic-link", {
                accessToken,
                refreshToken,
                redirect: false,
              });

              if (result?.error) {
                console.error("[MagicLink] NextAuth signIn error:", result.error);
                setErrorMessage(t("login.sendError"));
                setIsProcessingMagicLink(false);
                return;
              }

              // Redirect based on status
              if (checkData.status === "unauthorized") {
                router.push("/registration-pending");
              } else {
                router.push("/chat");
              }
            } else {
              // New user or incomplete registration - show form to collect name
              setIsProcessingMagicLink(false);
              setRegistrationStep("collecting_info");
              setPendingUserInfo({
                userId,
                email: userEmail,
                accessToken,
                refreshToken,
              });
            }
          } catch (error) {
            console.error("[MagicLink] Callback error:", error);
            setIsProcessingMagicLink(false);
          }
        }
      }
    };

    handleMagicLinkCallback();
  }, [router, t]);

  // Handle new user registration submission
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !pendingUserInfo) {
      return;
    }

    setIsSubmittingRegistration(true);

    try {
      // Create the user profile with the provided name
      const response = await fetch("/api/auth/magiclink/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingUserInfo.userId,
          email: pendingUserInfo.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isNewUser: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create profile");
      }

      // Sign in with NextAuth
      const result = await signIn("magic-link", {
        accessToken: pendingUserInfo.accessToken,
        refreshToken: pendingUserInfo.refreshToken,
        redirect: false,
      });

      if (result?.error) {
        console.error("[MagicLink] NextAuth signIn error:", result.error);
        setErrorMessage(t("login.sendError"));
        setIsSubmittingRegistration(false);
        return;
      }

      // Redirect to registration pending (new users are unauthorized)
      router.push("/registration-pending");
    } catch (error) {
      console.error("[Registration] Error:", error);
      setErrorMessage(t("login.sendError"));
      setIsSubmittingRegistration(false);
    }
  };

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

  // Show loading screen while processing magic link
  if (isProcessingMagicLink) {
    return (
      <div className="min-h-screen bg-[rgb(247,240,232)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-600 dark:text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Show registration form for new users
  if (registrationStep === "collecting_info") {
    return (
      <div className="min-h-screen bg-[rgb(247,240,232)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="p-8 sm:p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-300 dark:border-gray-700 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center">
                <Image
                  src={
                    isDark
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
            </div>

            {/* Welcome Message */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-light mb-2 text-gray-900 dark:text-white">
                {t('login.completeRegistration')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('login.completeRegistrationSubtitle')}
              </p>
              {pendingUserInfo?.email && (
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                  {pendingUserInfo.email}
                </p>
              )}
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('login.firstNamePlaceholder')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmittingRegistration}
                    required
                  />
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('login.lastNamePlaceholder')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmittingRegistration}
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmittingRegistration || !firstName.trim() || !lastName.trim()}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingRegistration ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('login.creating')}
                  </>
                ) : (
                  <>
                    {t('login.createAccount')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {t('login.termsText')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(247,240,232)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgb(230,220,210)]/40 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="p-8 sm:p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-300 dark:border-gray-700 shadow-2xl">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            {/* Icon Logo */}
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src={
                  isDark
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

            {/* Text Logo */}
            <div className="w-48 h-12 mx-auto mb-4">
              <Image
                src={
                  isDark
                    ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                    : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
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
