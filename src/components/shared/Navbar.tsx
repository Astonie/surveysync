"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOffline } from "@/providers/OfflineProvider";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, BarChart3, LogOut, User } from "lucide-react";

export function Navbar() {
  const { isOnline, pendingCount, isSyncing } = useOffline();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.name) setUserName(data.user.name);
        else if (data.user?.email) setUserName(data.user.email);
      })
      .catch(() => {});
  }, []);

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
          {userName && (
            <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                {userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <span className="hidden sm:inline">{userName}</span>
            </Link>
          )}
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
