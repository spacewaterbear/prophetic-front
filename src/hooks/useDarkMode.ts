import { useTheme } from "next-themes";

/**
 * Returns true when the active theme is dark.
 * Handles the "system" theme value by also checking resolvedTheme.
 */
export function useDarkMode(): boolean {
  const { theme, resolvedTheme } = useTheme();
  return theme === "dark" || resolvedTheme === "dark";
}
