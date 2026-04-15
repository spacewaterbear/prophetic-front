"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { LOGO_SMALL_DARK, LOGO_SMALL_LIGHT } from "@/lib/constants/logos";

export const AIAvatar = memo(() => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark" || resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="hidden sm:flex w-6 h-6 sm:w-7 sm:h-7 mt-1 items-center justify-center flex-shrink-0">
      <Image
        src={
          mounted && isDark
            ? LOGO_SMALL_DARK
            : LOGO_SMALL_LIGHT
        }
        alt="Prophetic Orchestra"
        width={28}
        height={28}
        className="w-full h-full object-contain"
        unoptimized
        priority
      />
    </div>
  );
});

AIAvatar.displayName = "AIAvatar";
