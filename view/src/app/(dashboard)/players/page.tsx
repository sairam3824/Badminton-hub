"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { Edit3, Check, X, Calendar, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn, formatSkillLevel } from "@/lib/utils";

interface Player {
  id: string;
  displayName: string;
  skillLevel: string;
  avatar: string | null;
  teamMember: { userId: string; role: string; user: { name: string; email: string } };
  matchPlayers: {
    side: number;
    match: { id: string; type: string; status: string; winningSide: number | null; scheduledAt: string };
  }[];
}

interface Availability {
  id: string;
  date: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE";
  notes: string | null;
}

const skillColors = {
  BEGINNER: "badge-gray",
  INTERMEDIATE: "badge-blue",
  ADVANCED: "badge-green",
};

const availabilityConfig = {
  AVAILABLE: { label: "Available", icon: CheckCircle2, className: "text-primary-600 bg-primary-50 border-primary-200" },
  UNAVAILABLE: { label: "Unavailable", icon: XCircle, className: "text-red-500 bg-red-50 border-red-200" },
  MAYBE: { label: "Maybe", icon: HelpCircle, className: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

// Generate the next 7 days
function getNext7Days() {
  const today = startOfToday();
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

export default function PlayersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const teamId = session?.activeTeamId;

  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", skillLevel: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["players", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/players?teamId=${teamId}`);
      return res.json() as Promise<{ players: Player[] }>;
    },
    enabled: !!teamId,
  });

  const players = data?.players || [];
  const myUserId = session?.user.id;
  const isAdmin = session?.teams?.find(t => t.id === teamId)?.role === "ADMIN";

  // Find my player profile
  const myPlayer = players.find(p => p.teamMember.userId === myUserId);

  const availabilityQueries = useQueries({
    queries: players.map((player) => ({
      queryKey: ["availability", player.id],
      queryFn: async () => {
        const res = await fetch(`/api/players/${player.id}/availability`);
        if (!res.ok) {
          throw new Error("Failed to fetch availability");
        }
        return res.json() as Promise<{ availability: Availability[] }>;
      },
      enabled: !!teamId,
      staleTime: 30 * 1000,
    })),
  });

  const availabilityByPlayerId = players.reduce<Record<string, Availability[]>>((acc, player, index) => {
    acc[player.id] = availabilityQueries[index]?.data?.availability || [];
    return acc;
  }, {});

  function getAvailabilityForDate(playerId: string, date: Date) {
    const availability = availabilityByPlayerId[playerId] || [];
    return availability.find((entry) => isSameDay(new Date(entry.date), date));
  }

  async function setAvailability(playerId: string, date: Date, status: Availability["status"]) {
    setSavingAvailability(`${playerId}-${date.toISOString()}`);
    try {
      await fetch(`/api/players/${playerId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          status,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["availability", playerId] });
    } finally {
      setSavingAvailability(null);
    }
  }

  function getPlayerStats(player: Player) {
    const completed = player.matchPlayers.filter(mp => mp.match.status === "COMPLETED");
    const wins = completed.filter(mp => mp.match.winningSide === mp.side);
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0;
    return {
      played: completed.length,
      wins: wins.length,
      losses: completed.length - wins.length,
      winRate,
      upcoming: player.matchPlayers.filter(mp => mp.match.status === "SCHEDULED").length,
    };
  }

  function startEdit(player: Player) {
    setEditingPlayer(player.id);
    setEditForm({ displayName: player.displayName, skillLevel: player.skillLevel });
  }

  async function saveEdit(playerId: string) {
    setSavingEdit(true);
    try {
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, ...editForm }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["players", teamId] });
        setEditingPlayer(null);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  const next7Days = getNext7Days();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {players.length} player{players.length !== 1 ? "s" : ""} on this team
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* My Availability — quick section at top for logged-in player */}
      {myPlayer && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                My Availability
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Let your team know when you can play (next 7 days)</p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {next7Days.map((date) => {
              const avail = getAvailabilityForDate(myPlayer.id, date);
              const key = `${myPlayer.id}-${date.toISOString()}`;
              const isSaving = savingAvailability === key;
              const isToday = isSameDay(date, startOfToday());

              return (
                <div key={date.toISOString()} className="text-center">
                  <p className={cn("text-xs font-medium mb-1.5", isToday ? "text-primary-600" : "text-gray-400")}>
                    {format(date, "EEE")}
                  </p>
                  <p className={cn("text-xs mb-1.5", isToday ? "text-primary-700 font-semibold" : "text-gray-500")}>
                    {format(date, "d")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {(["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const).map((status) => {
                      const cfg = availabilityConfig[status];
                      const isActive = avail?.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setAvailability(myPlayer.id, date, status)}
                          disabled={isSaving}
                          title={cfg.label}
                          className={cn(
                            "w-full h-6 rounded border transition-all text-xs flex items-center justify-center",
                            isActive
                              ? cfg.className + " opacity-100"
                              : "border-gray-200 bg-white text-gray-300 hover:border-gray-300"
                          )}
                        >
                          {isSaving ? (
                            <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <cfg.icon className="w-3 h-3" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {(["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const).map(status => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-gray-400">
                {(() => {
                  const cfg = availabilityConfig[status];
                  return <cfg.icon className="w-3 h-3" />;
                })()}
                {availabilityConfig[status].label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Availability Overview */}
      {players.length > 1 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Team Availability</h2>
            <p className="text-xs text-gray-400 mt-0.5">Next 7 days overview</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left p-3 text-xs font-medium text-gray-500 w-32">Player</th>
                  {next7Days.map(date => (
                    <th key={date.toISOString()} className="p-2 text-center text-xs font-medium text-gray-500 min-w-[52px]">
                      <span className={cn(isSameDay(date, startOfToday()) && "text-primary-600 font-semibold")}>
                        {format(date, "EEE")}<br />
                        <span className="font-normal">{format(date, "d")}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {players.map(player => {
                  const isMe = player.teamMember.userId === myUserId;
                  return (
                    <tr key={player.id} className={cn("hover:bg-gray-50", isMe && "bg-primary-50/30")}>
                      <td className="p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 text-xs font-bold">{player.displayName[0]}</span>
                          </div>
                          <span className="truncate max-w-[80px]">{player.displayName.split(" ")[0]}</span>
                          {isMe && <span className="text-primary-400 text-xs">(you)</span>}
                        </div>
                      </td>
                      {next7Days.map(date => {
                        const avail = getAvailabilityForDate(player.id, date);
                        return (
                          <td key={date.toISOString()} className="p-2 text-center">
                            {avail ? (
                              <div className={cn(
                                "w-6 h-6 rounded-full mx-auto flex items-center justify-center border",
                                availabilityConfig[avail.status].className
                              )}>
                                {(() => {
                                  const cfg = availabilityConfig[avail.status];
                                  return <cfg.icon className="w-3 h-3" />;
                                })()}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full mx-auto border border-dashed border-gray-200" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player Cards */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Roster</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((player) => {
            const stats = getPlayerStats(player);
            const isMe = player.teamMember.userId === myUserId;
            const canEdit = isMe || isAdmin;
            const isEditing = editingPlayer === player.id;

            return (
              <div key={player.id} className={cn("card p-5", isMe && "ring-2 ring-primary-200")}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white text-base font-bold shadow-sm",
                      isMe ? "bg-gradient-to-br from-primary-500 to-primary-700" : "bg-gradient-to-br from-gray-400 to-gray-500"
                    )}>
                      {player.displayName[0].toUpperCase()}
                    </div>
                    <div>
                      {isEditing ? (
                        <input
                          className="input py-1 text-sm font-semibold"
                          value={editForm.displayName}
                          onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">
                          {player.displayName}
                          {isMe && <span className="ml-1.5 text-xs text-primary-500">(You)</span>}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isEditing ? (
                          <select
                            className="input py-0.5 text-xs"
                            value={editForm.skillLevel}
                            onChange={e => setEditForm(prev => ({ ...prev, skillLevel: e.target.value }))}
                          >
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                          </select>
                        ) : (
                          <span className={skillColors[player.skillLevel as keyof typeof skillColors] || "badge-gray"}>
                            {formatSkillLevel(player.skillLevel)}
                          </span>
                        )}
                        {player.teamMember.role === "ADMIN" && (
                          <span className="badge-yellow">Admin</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      isEditing ? (
                        <>
                          <button onClick={() => saveEdit(player.id)} disabled={savingEdit}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPlayer(null)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(player)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{stats.played}</p>
                    <p className="text-xs text-gray-400">Played</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary-600">{stats.wins}</p>
                    <p className="text-xs text-gray-400">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{stats.losses}</p>
                    <p className="text-xs text-gray-400">Losses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-700">{stats.winRate}%</p>
                    <p className="text-xs text-gray-400">Win%</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-2">{player.teamMember.user.email}</p>
              </div>
            );
          })}
        </div>
      </div>

      {!isLoading && players.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No players yet</h3>
          <p className="text-gray-500 text-sm">Invite members from Settings to add them to the roster.</p>
        </div>
      )}
    </div>
  );
}
