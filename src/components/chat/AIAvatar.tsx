"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

export const AIAvatar = memo(() => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark" || resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full items-center justify-center flex-shrink-0 overflow-hidden">
      <Image
        src={
          mounted && isDark
            ? "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_white.svg"
            : "https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon_new.svg"
        }
        alt="Prophetic Orchestra"
        width={40}
        height={40}
        className="w-full h-full object-cover"
        priority
      />
    </div>
  );
});

AIAvatar.displayName = "AIAvatar";
