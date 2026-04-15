"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, User, AlertCircle, ArrowRight } from "lucide-react";

interface PendingSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export default function AuthCallbackPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"exchanging" | "registering" | "signing_in" | "error">("exchanging");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!code && !tokenHash) {
      setStatus("error");
      setErrorMessage(t("login.sendError"));
      return;
    }

    const exchangeCode = async () => {
      try {
        // Magic link OTP flow (token_hash + type=email) or OAuth PKCE flow (code)
        const { data, error } =
          tokenHash && (type === "email" || type === "magiclink")
            ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
            : await supabase.auth.exchangeCodeForSession(code!);

        if (error || !data.session || !data.user) {
          console.error("[AuthCallback] Code exchange failed:", error);
          setStatus("error");
          setErrorMessage(t("login.sendError"));
          return;
        }

        const { access_token, refresh_token } = data.session;
        const userId = data.user.id;
        const email = data.user.email ?? "";

        // Check whether the profile already exists and registration is complete
        const checkResponse = await fetch("/api/auth/magiclink/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, email }),
        });
        const checkData = await checkResponse.json();

        if (checkData.exists && checkData.registrationComplete) {
          // Returning user — sign in immediately
          setStatus("signing_in");
          const result = await signIn("magic-link", {
            accessToken: access_token,
            refreshToken: refresh_token,
            redirect: false,
          });

          if (result?.error) {
            console.error("[AuthCallback] NextAuth signIn error:", result.error);
            setStatus("error");
            setErrorMessage(t("login.sendError"));
            return;
          }

          router.push(checkData.status === "unauthorized" ? "/registration-pending" : "/chat");
        } else {
          // New user — collect name before creating profile
          setPendingSession({ accessToken: access_token, refreshToken: refresh_token, userId, email });
          setStatus("registering");
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus("error");
        setErrorMessage(t("login.sendError"));
      }
    };

    exchangeCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !pendingSession) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/magiclink/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingSession.userId,
          email: pendingSession.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isNewUser: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create profile");

      const result = await signIn("magic-link", {
        accessToken: pendingSession.accessToken,
        refreshToken: pendingSession.refreshToken,
        redirect: false,
      });

      if (result?.error) {
        console.error("[AuthCallback] NextAuth signIn error:", result.error);
        setErrorMessage(t("login.sendError"));
        setIsSubmitting(false);
        return;
      }

      router.push("/registration-pending");
    } catch (err) {
      console.error("[AuthCallback] Registration error:", err);
      setErrorMessage(t("login.sendError"));
      setIsSubmitting(false);
    }
  };

  if (status === "exchanging" || status === "signing_in") {
    return (
      <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-600 dark:text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 mb-6">{errorMessage || t("login.sendError")}</p>
          <Button onClick={() => router.push("/login")} variant="outline">
            {t("login.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  // status === "registering"
  return (
    <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 sm:p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-300 dark:border-gray-700 shadow-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-light mb-2 text-gray-900 dark:text-white">
              {t("login.completeRegistration")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t("login.completeRegistrationSubtitle")}
            </p>
            {pendingSession?.email && (
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">{pendingSession.email}</p>
            )}
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t("login.firstNamePlaceholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t("login.lastNamePlaceholder")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
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
              disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("login.creating")}
                </>
              ) : (
                <>
                  {t("login.createAccount")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t("login.termsText")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
