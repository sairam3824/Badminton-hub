"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Trophy } from "lucide-react";
import { cn, formatMatchType } from "@/lib/utils";

type Tab = "upcoming" | "live" | "past";

interface Match {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  winningSide: number | null;
  players: { side: number; position: number; player: { displayName: string } }[];
  sets: { side1Score: number; side2Score: number; isComplete: boolean; winningSide: number | null }[];
  venue: { name: string } | null;
}

function getMatchScore(sets: Match["sets"]) {
  const side1Sets = sets.filter(s => s.isComplete && s.winningSide === 1).length;
  const side2Sets = sets.filter(s => s.isComplete && s.winningSide === 2).length;
  const lastSet = sets.filter(s => !s.isComplete)[0];
  return { side1Sets, side2Sets, lastSet };
}

function MatchesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && ["upcoming", "live", "past"].includes(tabParam) ? tabParam : "upcoming"
  );

  function changeTab(t: Tab) {
    setTab(t);
    router.replace(`/matches?tab=${t}`, { scroll: false });
  }

  const teamId = session?.activeTeamId;

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/matches?teamId=${teamId}`);
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json() as Promise<{ matches: Match[] }>;
    },
    enabled: !!teamId,
    refetchInterval: 10000,
  });

  const now = new Date();
  const allMatches = data?.matches || [];

  const upcoming = allMatches.filter(m => m.status === "SCHEDULED" && new Date(m.scheduledAt) >= now);
  const live = allMatches.filter(m => m.status === "LIVE");
  const past = allMatches.filter(m => m.status === "COMPLETED" || m.status === "CANCELLED" || new Date(m.scheduledAt) < now);

  const displayMatches = tab === "upcoming" ? upcoming : tab === "live" ? live : past.filter(m => m.status === "COMPLETED" || m.status === "CANCELLED");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track your team&apos;s matches</p>
        </div>
        <Link href="/matches/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Schedule</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["upcoming", "live", "past"] as Tab[]).map((t) => {
          const count = t === "upcoming" ? upcoming.length : t === "live" ? live.length : past.filter(m => m.status === "COMPLETED").length;
          return (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all",
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t === "live" && live.length > 0 && (
                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse" />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {count > 0 && <span className="ml-1.5 text-xs text-gray-400">({count})</span>}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-8 text-center text-red-500">
          <p>Failed to load matches. Please refresh.</p>
        </div>
      )}

      {!isLoading && displayMatches.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🏸</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {tab === "upcoming" ? "No upcoming matches" : tab === "live" ? "No live matches" : "No past matches"}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {tab === "upcoming" ? "Schedule a match to get started." : tab === "live" ? "Start a scheduled match to see it here." : "Completed matches will appear here."}
          </p>
          {tab === "upcoming" && (
            <Link href="/matches/new" className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              Schedule a match
            </Link>
          )}
        </div>
      )}

      <div className="space-y-3">
        {displayMatches.map((match) => {
          const side1Players = match.players.filter(p => p.side === 1);
          const side2Players = match.players.filter(p => p.side === 2);
          const { side1Sets, side2Sets } = getMatchScore(match.sets);
          const completedSets = match.sets.filter(s => s.isComplete);
          const isWon = match.status === "COMPLETED";

          return (
            <Link key={match.id} href={`/matches/${match.id}`} className="card-hover p-4 flex items-center gap-4 block">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    match.status === "LIVE" ? "bg-red-100 text-red-700" :
                    match.status === "COMPLETED" ? "bg-gray-100 text-gray-600" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {match.status === "LIVE" && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />}
                    {match.status === "LIVE" ? "Live" : match.status === "COMPLETED" ? "Finished" : "Scheduled"}
                  </span>
                  <span className="badge-gray">{formatMatchType(match.type)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold truncate", match.winningSide === 1 && "text-primary-600")}>
                        {side1Players.map(p => p.player.displayName.split(" ")[0]).join(" & ")}
                      </span>
                      {isWon && match.winningSide === 1 && <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-sm font-semibold truncate", match.winningSide === 2 && "text-primary-600")}>
                        {side2Players.map(p => p.player.displayName.split(" ")[0]).join(" & ")}
                      </span>
                      {isWon && match.winningSide === 2 && <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    </div>
                  </div>

                  {match.status !== "SCHEDULED" && (
                    <div className="text-right flex-shrink-0">
                      <div className={cn("text-base font-bold", match.winningSide === 1 ? "text-primary-600" : "text-gray-400")}>
                        {side1Sets}
                      </div>
                      <div className={cn("text-base font-bold", match.winningSide === 2 ? "text-primary-600" : "text-gray-400")}>
                        {side2Sets}
                      </div>
                    </div>
                  )}

                  {completedSets.length > 0 && (
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="text-xs text-gray-400">
                        {completedSets.map(s => `${s.side1Score}-${s.side2Score}`).join(", ")}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(match.scheduledAt), "EEE d MMM · h:mm a")}
                  </span>
                  {match.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {match.venue.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MatchesContent />
    </Suspense>
  );
}
