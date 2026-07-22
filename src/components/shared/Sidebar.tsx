"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FilePlus, List, Settings, HelpCircle, User } from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "New Survey",
    href: "/surveys/new",
    icon: FilePlus,
    exact: true,
  },
  {
    label: "My Surveys",
    href: "/surveys",
    icon: List,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    exact: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    exact: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar p-4">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (pathname.startsWith(item.href + "/") && !pathname.startsWith("/surveys/new"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t">
        <a
          href="https://github.com/your-org/survey-sync"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </a>
      </div>
    </aside>
  );
}
