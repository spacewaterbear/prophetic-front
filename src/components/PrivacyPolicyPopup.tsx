"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/i18n-context";

export function PrivacyPolicyPopup() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [cguChecked, setCguChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    fetch("/api/accept-privacy")
      .then((r) => r.json())
      .then((data: { accepted: boolean }) => {
        if (!data.accepted) setShow(true);
      })
      .catch(() => {});
  }, [status, session?.user?.id]);

  const handleAccept = async () => {
    if (!privacyChecked || !cguChecked || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/accept-privacy", { method: "POST" });
      if (res.ok) setShow(false);
    } catch {
      // keep modal open on error
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const bothChecked = privacyChecked && cguChecked;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("privacyPopup.title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t("privacyPopup.message")}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-gray-900 dark:accent-white cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t("privacyPopup.checkboxLabel")}{" "}
              <a
                href="/confidentiality-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium text-gray-900 dark:text-white hover:opacity-75"
              >
                {t("privacyPopup.checkboxLink")}
              </a>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cguChecked}
              onChange={(e) => setCguChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-gray-900 dark:accent-white cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t("privacyPopup.cguCheckboxLabel")}{" "}
              <a
                href="/cgu"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium text-gray-900 dark:text-white hover:opacity-75"
              >
                {t("privacyPopup.cguCheckboxLink")}
              </a>
            </span>
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!bothChecked || submitting}
          className="w-full h-11 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("privacyPopup.accept")}
        </Button>
      </div>
    </div>
  );
}
