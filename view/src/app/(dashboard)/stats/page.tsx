"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Trophy, TrendingUp, Target, Medal, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerStat {
  player: { id: string; displayName: string; skillLevel: string };
  totalMatches: number; wins: number; losses: number; winRate: number;
  singlesWins: number; doublesWins: number; setsWon: number; setsLost: number;
  pointsScored: number; pointsConceded: number;
}

const COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function StatsPage() {
  const { data: session } = useSession();
  const teamId = session?.activeTeamId;
  const [view, setView] = useState<"leaderboard" | "charts" | "h2h">("leaderboard");

  const { data, isLoading } = useQuery({
    queryKey: ["stats", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/stats?teamId=${teamId}`);
      return res.json() as Promise<{
        playerStats: PlayerStat[];
        h2h: Record<string, Record<string, { wins: number; losses: number }>>;
        monthlyTrend: { month: string; matches: number; singles: number; doubles: number }[];
        totalMatches: number; totalSingles: number; totalDoubles: number;
      }>;
    },
    enabled: !!teamId,
  });

  const stats = data;
  const players = stats?.playerStats || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || players.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your team&apos;s performance</p>
        </div>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No stats yet</h3>
          <p className="text-gray-500 text-sm">Complete some matches to see statistics here.</p>
        </div>
      </div>
    );
  }

  const winRateData = players.map(p => ({
    name: p.player.displayName.split(" ")[0],
    winRate: p.winRate,
    wins: p.wins,
    losses: p.losses,
  }));

  const pieData = [
    { name: "Singles", value: stats.totalSingles, color: "#16a34a" },
    { name: "Doubles", value: stats.totalDoubles, color: "#3b82f6" },
  ];

  const pointsData = players.map(p => ({
    name: p.player.displayName.split(" ")[0],
    scored: p.pointsScored,
    conceded: p.pointsConceded,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.totalMatches} matches completed</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="stat-green rounded-2xl p-3 sm:p-4 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-10 h-10 opacity-20 rounded-full bg-white -translate-y-2 translate-x-2" />
          <div className="text-xl sm:text-2xl font-bold">{stats.totalMatches}</div>
          <div className="text-xs opacity-80 mt-0.5 font-medium">Total</div>
        </div>
        <div className="stat-blue rounded-2xl p-3 sm:p-4 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-10 h-10 opacity-20 rounded-full bg-white -translate-y-2 translate-x-2" />
          <div className="text-xl sm:text-2xl font-bold">{stats.totalSingles}</div>
          <div className="text-xs opacity-80 mt-0.5 font-medium">Singles</div>
        </div>
        <div className="stat-purple rounded-2xl p-3 sm:p-4 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-10 h-10 opacity-20 rounded-full bg-white -translate-y-2 translate-x-2" />
          <div className="text-xl sm:text-2xl font-bold">{stats.totalDoubles}</div>
          <div className="text-xs opacity-80 mt-0.5 font-medium">Doubles</div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {(["leaderboard", "charts", "h2h"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 sm:px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0",
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {v === "h2h" ? "H2H" : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {view === "leaderboard" && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Team Leaderboard
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {players.map((ps, idx) => (
              <div key={ps.player.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                  idx === 1 ? "bg-gray-100 text-gray-600" :
                  idx === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-gray-50 text-gray-400"
                )}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{ps.player.displayName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{ps.totalMatches} played</span>
                    <span className="text-xs text-primary-600 font-medium">{ps.wins}W</span>
                    <span className="text-xs text-red-500">{ps.losses}L</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-[160px]">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all"
                      style={{ width: `${ps.winRate}%` }}
                    />
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-gray-900">{ps.winRate}%</div>
                  <div className="text-xs text-gray-400">Win rate</div>
                </div>

                {/* Win bar */}
                <div className="w-16 hidden sm:block">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${ps.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {view === "charts" && (
        <div className="space-y-4">
          {/* Win rate bar chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Win Rate by Player</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winRateData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(val) => [`${val}%`, "Win Rate"]} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {winRateData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Match type pie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Match Types</h3>
              {stats.totalMatches > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map(p => (
                      <div key={p.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-sm text-gray-600">{p.name}: {p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>

            {/* Points chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Points Scored</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={pointsData.slice(0, 6)} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="scored" fill="#16a34a" radius={[3, 3, 0, 0]} name="Scored" />
                  <Bar dataKey="conceded" fill="#fca5a5" radius={[3, 3, 0, 0]} name="Conceded" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly trend */}
          {stats.monthlyTrend.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Activity</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={stats.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="matches" stroke="#16a34a" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="singles" stroke="#3b82f6" strokeWidth={2} dot={false} name="Singles" />
                  <Line type="monotone" dataKey="doubles" stroke="#f59e0b" strokeWidth={2} dot={false} name="Doubles" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Head to Head */}
      {view === "h2h" && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Head to Head</h2>
            <p className="text-xs text-gray-400 mt-0.5">Win/Loss record between players (singles)</p>
          </div>
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-xs font-medium text-gray-500 w-32">Player</th>
                  {players.map(ps => (
                    <th key={ps.player.id} className="p-3 text-xs font-medium text-gray-500 text-center min-w-[60px]">
                      {ps.player.displayName.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {players.map(ps => (
                  <tr key={ps.player.id} className="hover:bg-gray-50">
                    <td className="p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                      {ps.player.displayName.split(" ")[0]}
                    </td>
                    {players.map(opponent => {
                      if (ps.player.id === opponent.player.id) {
                        return <td key={opponent.player.id} className="p-3 bg-gray-100 text-center text-gray-300">—</td>;
                      }
                      const record = stats.h2h[ps.player.id]?.[opponent.player.id];
                      const total = (record?.wins || 0) + (record?.losses || 0);
                      return (
                        <td key={opponent.player.id} className="p-3 text-center">
                          {total === 0 ? (
                            <span className="text-gray-200 text-xs">–</span>
                          ) : (
                            <div>
                              <span className={cn("font-semibold", (record?.wins || 0) > (record?.losses || 0) ? "text-primary-600" : "text-red-400")}>
                                {record?.wins || 0}
                              </span>
                              <span className="text-gray-300">–</span>
                              <span className={cn("font-semibold", (record?.losses || 0) > (record?.wins || 0) ? "text-red-400" : "text-gray-400")}>
                                {record?.losses || 0}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
