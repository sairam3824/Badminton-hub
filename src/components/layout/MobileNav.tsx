"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Swords, Users, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/matches", icon: Swords, label: "Matches" },
  { href: "/matches/new", icon: Plus, label: "New", highlight: true },
  { href: "/players", icon: Users, label: "Players" },
  { href: "/stats", icon: BarChart3, label: "Stats" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed left-3 right-3 z-40 mobile-nav-island">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-xl px-1 py-1.5">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              !item.highlight &&
              (pathname === item.href || pathname.startsWith(item.href + "/"));

            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 flex-1 pb-1 pt-0"
                  aria-label="New match"
                >
                  <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-md shadow-primary-200/60 -mt-6">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 min-h-[56px] justify-center",
                  isActive ? "text-primary-700" : "text-gray-400 hover:text-gray-600"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    isActive ? "bg-primary-50" : ""
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.2]" : "stroke-[1.8]")} />
                </div>
                <span className={cn("text-[10px] leading-none", isActive ? "font-bold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
