import { useEffect, useState } from "react";

/**
 * Global search overlay open state + Cmd/Ctrl-K keyboard shortcut.
 * Extracted verbatim from StudentApp.tsx (pure move-and-extract).
 */
export function useGlobalSearchShortcut() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { searchOpen, setSearchOpen };
}
