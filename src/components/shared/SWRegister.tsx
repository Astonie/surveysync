"use client";

import { useEffect } from "react";
import { Serwist } from "@serwist/window";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function SWRegister() {
  const { resetWasOffline } = useOnlineStatus();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const serwist = new Serwist("/sw.js");
      void serwist.register({ immediate: true });

      serwist.addEventListener("waiting", () => {
        serwist.messageSkipWaiting();
      });

      serwist.addEventListener("controlling", () => {
        resetWasOffline();
      });
    }
  }, [resetWasOffline]);

  return null;
}
