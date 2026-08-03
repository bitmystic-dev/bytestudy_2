import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const THEMES = ["calm", "classic"] as const;
export const MODES = ["light", "dark", "system"] as const;
export const ACCENTS = ["violet", "blue", "teal", "green", "amber", "rose"] as const;
export const RADII = ["compact", "soft", "round"] as const;

export type ThemeName = (typeof THEMES)[number];
export type ThemeMode = (typeof MODES)[number];
export type AccentName = (typeof ACCENTS)[number];
export type RadiusName = (typeof RADII)[number];

export type ThemePrefs = {
  theme: ThemeName;
  mode: ThemeMode;
  accent: AccentName;
  radius: RadiusName;
};

export const DEFAULT_PREFS: ThemePrefs = {
  theme: "calm",
  mode: "light",
  accent: "blue",
  radius: "soft",
};

export const THEME_STORAGE_KEY = "byteprep.appearance";

export const ACCENT_LABELS: Record<AccentName, string> = {
  violet: "Violet",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  amber: "Amber",
  rose: "Rose",
};

/**
 * Inline script injected into <head> so the correct theme is painted before
 * first paint — no flash of the wrong theme on reload.
 */
export const themeBootstrapScript = `(function(){try{
var d=document.documentElement;
var p=${JSON.stringify(DEFAULT_PREFS)};
try{var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(raw){var s=JSON.parse(raw);if(s&&typeof s==='object'){p=Object.assign(p,s);}}}catch(e){}
var dark=p.mode==='dark'||(p.mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
d.setAttribute('data-theme',p.theme);
d.setAttribute('data-accent',p.accent);
d.setAttribute('data-radius',p.radius);
d.classList.toggle('dark',dark);
d.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;

function readPrefs(): ThemePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    return {
      theme: THEMES.includes(parsed.theme as ThemeName) ? (parsed.theme as ThemeName) : DEFAULT_PREFS.theme,
      mode: MODES.includes(parsed.mode as ThemeMode) ? (parsed.mode as ThemeMode) : DEFAULT_PREFS.mode,
      accent: ACCENTS.includes(parsed.accent as AccentName) ? (parsed.accent as AccentName) : DEFAULT_PREFS.accent,
      radius: RADII.includes(parsed.radius as RadiusName) ? (parsed.radius as RadiusName) : DEFAULT_PREFS.radius,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefs(prefs: ThemePrefs) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  const dark =
    prefs.mode === "dark" ||
    (prefs.mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  d.setAttribute("data-theme", prefs.theme);
  d.setAttribute("data-accent", prefs.accent);
  d.setAttribute("data-radius", prefs.radius);
  d.classList.toggle("dark", dark);
  d.style.colorScheme = dark ? "dark" : "light";
}

type ThemeContextValue = ThemePrefs & {
  resolvedMode: "light" | "dark";
  setPrefs: (patch: Partial<ThemePrefs>) => void;
  reset: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ThemePrefs>(DEFAULT_PREFS);
  const [systemDark, setSystemDark] = useState(false);

  // Hydrate from storage after mount (SSR-safe).
  useEffect(() => {
    const stored = readPrefs();
    setPrefsState(stored);
    applyPrefs(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setPrefs = useCallback((patch: Partial<ThemePrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      applyPrefs(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), [setPrefs]);

  const resolvedMode: "light" | "dark" =
    prefs.mode === "system" ? (systemDark ? "dark" : "light") : prefs.mode;

  const value = useMemo(
    () => ({ ...prefs, resolvedMode, setPrefs, reset }),
    [prefs, resolvedMode, setPrefs, reset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
