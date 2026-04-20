"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

const STORAGE_KEY = "prophetic_onboarding_v1";

const STORAGE = "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/start";

const STEP_IMAGES = [
  `${STORAGE}/image1.png`,
  `${STORAGE}/image2.png`,
  `${STORAGE}/image3.png`,
];

interface OnboardingPopupProps {
  userStatus?: string;
}

export function OnboardingPopup({ userStatus }: OnboardingPopupProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const isSubscribed =
      userStatus === "discover" ||
      userStatus === "intelligence" ||
      userStatus === "oracle" ||
      userStatus === "admini";

    const forceShow = process.env.NEXT_PUBLIC_FIRST_VISIT === "true";

    if (!forceShow && isSubscribed) return;

    const seen = localStorage.getItem(STORAGE_KEY);
    if (forceShow || !seen) {
      setVisible(true);
    }
  }, [userStatus]);

  const dismiss = () => {
    if (process.env.NEXT_PUBLIC_FIRST_VISIT !== "true") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
  };

  const next = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const isLast = step === 2;

  const step2Desc = t("onboarding.step2Desc")
    .replace(
      "{plans}",
      `<a href="/pricing" class="text-[#4b7bec] no-underline font-medium hover:underline">${t("onboarding.step2Plans")}</a>`
    )
    .replace(
      "{support}",
      `<a href="mailto:contact@prophetic-orchestra.com" class="text-[#4b7bec] no-underline font-medium hover:underline">${t("onboarding.step2Support")}</a>`
    );

  const descriptions = [
    t("onboarding.step1Desc"),
    step2Desc,
    t("onboarding.step3Desc"),
  ];

  const titles = [
    t("onboarding.step1Title"),
    t("onboarding.step2Title"),
    t("onboarding.step3Title"),
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className="w-full max-w-[460px] rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#1a1a1a]"
        style={{ animation: "fadeInScale 0.2s ease" }}
      >
        {/* Header image area */}
        <div className="relative h-[190px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={STEP_IMAGES[step]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/35 transition-colors text-white z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-2.5 leading-snug">
            {titles[step]}
          </h2>

          {step === 1 ? (
            <p
              className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: descriptions[1] }}
            />
          ) : (
            <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              {descriptions[step]}
            </p>
          )}

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block rounded-full transition-all duration-200"
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  background: i === step ? "#000" : "#d1d5db",
                }}
              />
            ))}
          </div>

          {/* Button */}
          <div className="flex justify-center">
            <button
              onClick={next}
              className="bg-black dark:bg-white text-white dark:text-black font-semibold text-[15px] rounded-xl px-10 py-3 w-full max-w-[200px] hover:opacity-90 transition-opacity"
            >
              {isLast ? t("onboarding.tryNow") : t("onboarding.continue")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
