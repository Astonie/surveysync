"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStatus } from "@/hooks/useSyncStatus";

interface OfflineContextType {
  isOnline: boolean;
  wasOffline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  syncNow: () => void;
  resetWasOffline: () => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  wasOffline: false,
  pendingCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  syncNow: () => {},
  resetWasOffline: () => {},
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();
  const {
    pendingCount,
    isSyncing,
    lastSyncTime,
    error: syncError,
    syncNow,
  } = useSyncStatus();

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncNow();
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (pendingCount > 0 && !isSyncing) {
        syncNow();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        wasOffline,
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncError,
        syncNow,
        resetWasOffline,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
