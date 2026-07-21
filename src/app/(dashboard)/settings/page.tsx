"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOffline } from "@/providers/OfflineProvider";
import { db } from "@/offline/db";
import { Wifi, WifiOff, Trash2, RefreshCw, Database } from "lucide-react";

export default function SettingsPage() {
  const { isOnline, pendingCount, syncNow, isSyncing } = useOffline();
  const [storageStats, setStorageStats] = useState({
    surveys: 0,
    responses: 0,
    syncQueue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const surveys = await db.surveys.count();
      const responses = await db.responses.count();
      const syncQueue = await db.syncQueue.count();
      setStorageStats({ surveys, responses, syncQueue });
    }
    loadStats();
  }, []);

  async function clearLocalData() {
    if (!confirm("This will remove all locally cached data. Continue?")) return;
    await db.surveys.clear();
    await db.responses.clear();
    await db.syncQueue.clear();
    setStorageStats({ surveys: 0, responses: 0, syncQueue: 0 });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Local Storage
          </CardTitle>
          <CardDescription>
            Data cached on this device for offline use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-bold">{storageStats.surveys}</p>
              <p className="text-xs text-muted-foreground">Cached Surveys</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-bold">{storageStats.responses}</p>
              <p className="text-xs text-muted-foreground">Local Responses</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-2xl font-bold">{storageStats.syncQueue}</p>
              <p className="text-xs text-muted-foreground">Pending Sync</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={syncNow}
              disabled={isSyncing || pendingCount === 0}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
            <Button
              variant="destructive"
              onClick={clearLocalData}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Local Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-500" />
            )}
            Network Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={isOnline ? "success" : "warning"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending Sync</span>
            <span className="font-medium">{pendingCount} items</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
