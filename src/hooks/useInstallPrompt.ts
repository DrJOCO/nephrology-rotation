import { useEffect, useMemo, useState } from "react";

const INSTALL_PROMPT_DISMISSED_KEY = "neph_installPromptDismissed";
const INSTALL_PROMPT_DELAY_MS = 18 * 60 * 60 * 1000;

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * PWA install prompt handling: captures `beforeinstallprompt`, tracks
 * dismissal, and derives which install-prompt variant (native/iOS) to show.
 * Extracted verbatim from StudentApp.tsx (pure move-and-extract).
 */
export function useInstallPrompt({ nameSet, joinedAt }: { nameSet: boolean; joinedAt: string | null }) {
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(() => localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "1");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as DeferredInstallPromptEvent;
      if (typeof promptEvent.prompt !== "function") return;
      event.preventDefault?.();
      setInstallPromptEvent(promptEvent);
    };

    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setInstallPromptDismissed(true);
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissInstallPrompt = () => {
    setInstallPromptDismissed(true);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } catch (error) {
      console.warn("Install prompt failed:", error);
    } finally {
      setInstallPromptEvent(null);
      dismissInstallPrompt();
    }
  };

  const installPromptVariant = useMemo<"native" | "ios" | null>(() => {
    if (typeof window === "undefined" || !nameSet || installPromptDismissed || !joinedAt) return null;
    const joinedMs = new Date(joinedAt).getTime();
    if (Number.isNaN(joinedMs) || Date.now() - joinedMs < INSTALL_PROMPT_DELAY_MS) return null;

    const inStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (inStandaloneMode) return null;

    if (installPromptEvent) return "native";

    const userAgent = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
    return isIos && isSafari ? "ios" : null;
  }, [installPromptDismissed, installPromptEvent, joinedAt, nameSet]);

  return { installPromptVariant, handleInstallApp, dismissInstallPrompt };
}
