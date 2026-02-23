"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { TeamSwitcher } from "./TeamSwitcher";

export function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100">
      <div className="flex items-center gap-2 px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0" aria-label="Go to dashboard">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm shadow-primary-200">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight hidden xs:block">BadmintonHub</span>
        </Link>

        <div className="flex-1" />

        <div className="w-32 flex-shrink-0">
          <TeamSwitcher />
        </div>

        <Link
          href="/settings"
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-1"
          aria-label="Settings"
        >
          <Settings className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </Link>
      </div>
    </header>
  );
}
