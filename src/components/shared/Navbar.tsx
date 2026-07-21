"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOffline } from "@/providers/OfflineProvider";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, BarChart3, LogOut } from "lucide-react";

export function Navbar() {
  const { isOnline, pendingCount, isSyncing } = useOffline();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <BarChart3 className="h-6 w-6" />
          SurveySync
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="success" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary">
                {isSyncing ? "Syncing..." : `${pendingCount} pending`}
              </Badge>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
