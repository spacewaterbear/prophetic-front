"use client";

import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";

interface SettingsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  mounted: boolean;
  isDark: boolean;
}

export function SettingsMenu({
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  mounted,
  isDark,
}: SettingsMenuProps) {
  const { t } = useI18n();

  return (
    <div className="static sm:relative flex-shrink-0">
      <button
        className="flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full px-3 py-2 border border-gray-300 dark:border-gray-600 transition-colors"
        aria-label="Settings"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Image
          src={
            mounted && isDark
              ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/settings_b.svg"
              : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/settings_n.svg"
          }
          alt="Settings"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <span className="text-sm font-medium whitespace-nowrap">{t("agents.orchestration")}</span>
      </button>

      {/* Desktop Dropdown */}
      <div
        className={`
          hidden sm:block
          absolute left-0 bottom-full mb-2
          transition-all duration-300 ease-out
          z-10
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="bg-[#f1e7dc] dark:bg-[#2a2b2c] text-gray-900 dark:text-white rounded-3xl p-5 w-[420px] shadow-2xl border dark:border-transparent">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {t("settings.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {t("settings.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {/* Market Scout Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src={
                    mounted && isDark
                      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/scout_b.svg"
                      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/scout_n.svg"
                  }
                  alt="Market Scout"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Market Scout{" "}
                    <sup className="text-[10px] font-bold">
                      {t("chat.comingSoon")}
                    </sup>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("settings.marketScoutDesc")}
                  </div>
                </div>
              </div>
              <button
                disabled
                className="flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none"
              >
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>

            {/* Community Radar Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#e8dfd5] dark:bg-[#1e1f20] rounded-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src={
                    mounted && isDark
                      ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/radar_b.svg"
                      : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/icons/radar_n.svg"
                  }
                  alt="Community Radar"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Community Radar{" "}
                    <sup className="text-[10px] font-bold">
                      {t("chat.comingSoon")}
                    </sup>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("settings.communityRadarDesc")}
                  </div>
                </div>
              </div>
              <button
                disabled
                className="flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none"
              >
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
