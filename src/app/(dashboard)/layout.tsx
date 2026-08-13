"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { cacheSession, getCachedSession } from "@/lib/offline-cache";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!data.user) {
          router.push("/login");
        } else {
          void cacheSession(data.user);
          setChecking(false);
        }
      } catch {
        const cached = await getCachedSession();
        if (cached?.user) {
          setChecking(false);
        } else {
          router.push("/login");
        }
      }
    }
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <OfflineProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </OfflineProvider>
  );
}
