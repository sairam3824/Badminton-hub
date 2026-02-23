"use client";

import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function TeamSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const teams = session?.teams || [];
  const activeTeamId = session?.activeTeamId;
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
    setOpen(!open);
  }

  async function switchTeam(teamId: string) {
    await update({ activeTeamId: teamId });
    setOpen(false);
    router.refresh();
  }

  if (!session) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {activeTeam?.name?.[0]?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activeTeam?.name || "Select team"}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {activeTeam
              ? teams.find((t) => t.id === activeTeamId)?.role?.toLowerCase()
              : "No team"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform flex-shrink-0",
            open && "rotate-180",
            "text-gray-400"
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1 overflow-y-auto max-h-64"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          >
            <div className="px-3 py-1.5 mb-1 border-b border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Your clubs</p>
            </div>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => switchTeam(team.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {team.name[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{team.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{team.role.toLowerCase()}</p>
                </div>
                {team.id === activeTeamId && (
                  <div className="w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
            {process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && (
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => { setOpen(false); router.push("/onboarding"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Add / Join Club</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
