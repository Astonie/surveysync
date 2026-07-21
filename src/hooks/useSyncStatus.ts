"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/offline/db";

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await db.syncQueue.count();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const syncNow = useCallback(async () => {
    if (isSyncing || pendingCount === 0) return;

    setIsSyncing(true);
    setError(null);

    try {
      const queueItems = await db.syncQueue.toArray();

      const response = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: queueItems }),
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      const result = await response.json();

      const syncedIds = result.syncedIds || [];
      if (syncedIds.length > 0) {
        await db.syncQueue.bulkDelete(syncedIds);
      }

      const failedIds = result.failedIds || [];
      for (const id of failedIds) {
        await db.syncQueue.update(id, { attempts: 0 });
      }

      setLastSyncTime(new Date().toISOString());
      await refreshPendingCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pendingCount, refreshPendingCount]);

  const addToQueue = useCallback(
    async (
      entityType: string,
      entityId: string,
      action: string,
      payload: unknown
    ) => {
      await db.syncQueue.add({
        entityType,
        entityId,
        action,
        payload: JSON.stringify(payload),
        createdAt: new Date().toISOString(),
        attempts: 0,
      });
      await refreshPendingCount();
    },
    [refreshPendingCount]
  );

  return {
    pendingCount,
    isSyncing,
    lastSyncTime,
    error,
    syncNow,
    addToQueue,
    refreshPendingCount,
  };
}
