"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart3,
  MapPin,
  Settings,
  LogOut,
  Plus,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamSwitcher } from "./TeamSwitcher";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/matches", icon: Swords, label: "Matches" },
  { href: "/players", icon: Users, label: "Players" },
  { href: "/stats", icon: BarChart3, label: "Statistics" },
  { href: "/venues", icon: MapPin, label: "Venues" },
  { href: "/teams", icon: Shield, label: "Teams" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className="hidden lg:flex fixed left-3 top-3 bottom-3 z-50 flex-col"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className={cn(
          "flex flex-col h-full bg-white rounded-2xl shadow-xl border border-gray-100 transition-[width] duration-300 ease-in-out overflow-hidden",
          expanded ? "w-56" : "w-[60px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3.5 h-[60px] border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-200">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          {expanded && (
            <span className="font-bold text-gray-900 whitespace-nowrap tracking-tight text-[15px]">
              BadmintonHub
            </span>
          )}
        </div>

        {/* Team Switcher */}
        <div
          className={cn(
            "border-b border-gray-100 flex-shrink-0 transition-all duration-300",
            expanded ? "max-h-20 px-3 py-2.5 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          )}
        >
          <TeamSwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!expanded ? item.label : undefined}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl transition-all duration-150",
                  expanded ? "gap-3" : "justify-center",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] flex-shrink-0",
                    isActive ? "text-primary-600" : ""
                  )}
                />
                {expanded && (
                  <span className={cn("text-sm whitespace-nowrap", isActive ? "font-semibold" : "font-medium")}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Schedule Match */}
          <div
            className={cn(
              "pt-2 mt-1 border-t border-gray-100 transition-opacity duration-200",
              expanded ? "opacity-100 delay-75" : "opacity-0 pointer-events-none"
            )}
          >
            <Link
              href="/matches/new"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">
                Schedule Match
              </span>
            </Link>
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={!expanded ? "Sign out" : undefined}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-xl w-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors",
              expanded ? "gap-3" : "justify-center"
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap">
                Sign out
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
