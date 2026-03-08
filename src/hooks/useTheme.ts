import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme as useNextTheme } from "next-themes";

/**
 * Reads theme preference from Convex settings and syncs to next-themes.
 * Falls back to system preference when no setting is stored.
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const settings = useQuery(api.settings.get);

  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings?.theme, theme, setTheme]);

  return {
    theme: resolvedTheme as "light" | "dark" | undefined,
    setTheme,
    isLight: resolvedTheme === "light",
    isDark: resolvedTheme === "dark",
  };
}
