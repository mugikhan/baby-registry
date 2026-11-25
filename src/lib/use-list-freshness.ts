import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const REFRESH_MS = 30_000;

/** Reloads the route data while the tab is visible. A background reload never shows a pending state. */
export function useListFreshness() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = () => void router.invalidate();
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = setInterval(refresh, REFRESH_MS);
    };
    const resume = () => {
      refresh();
      start();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resume();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);
}
