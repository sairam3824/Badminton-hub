"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Users, Copy, Check, Crown, Plus, LogIn, Swords,
  MapPin, ChevronRight, Loader2, AlertCircle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  role: string;
  createdAt: string;
  _count: { members: number; matches: number };
}

export default function TeamsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json() as Promise<{ teams: Team[] }>;
    },
  });

  const teams = data?.teams || [];
  const activeTeamId = session?.activeTeamId;

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function switchTeam(teamId: string) {
    await update({ activeTeamId: teamId });
    router.push("/dashboard");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(`"${data.team.name}" created successfully!`);
      setShowCreate(false);
      setCreateName(""); setCreateDesc("");
      await update({ activeTeamId: data.team.id });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(`Joined "${data.team.name}" successfully!`);
      setShowJoin(false);
      setJoinCode("");
      await update({ activeTeamId: data.team.id });
      refetch();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {teams.length} team{teams.length !== 1 ? "s" : ""} · switch between them anytime
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError(""); }}
            className="btn-secondary text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Join</span>
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError(""); }}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Create Team Form */}
      {showCreate && (
        <div className="card p-5 border-primary-200">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary-600" />
            Create a new team
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Team name *</label>
              <input
                className="input"
                placeholder="e.g. Smash Club"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                required maxLength={50}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="What's this team about?"
                value={createDesc}
                onChange={e => setCreateDesc(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowCreate(false); setError(""); }} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Team Form */}
      {showJoin && (
        <div className="card p-5 border-blue-200">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LogIn className="w-4 h-4 text-blue-600" />
            Join an existing team
          </h2>
          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="label">Invite code *</label>
              <input
                className="input uppercase tracking-widest font-mono"
                placeholder="XXXXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                required maxLength={20}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Ask your team admin for the invite code.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowJoin(false); setError(""); }} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Join team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const isActive = team.id === activeTeamId;
            const isAdmin = team.role === "ADMIN";

            return (
              <div
                key={team.id}
                className={cn(
                  "card p-5 transition-all",
                  isActive && "ring-2 ring-primary-400 border-primary-200"
                )}
              >
                {/* Team Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold",
                      isActive ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      {team.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{team.name}</h2>
                        {isActive && (
                          <span className="badge-green text-xs flex-shrink-0">Active</span>
                        )}
                        {isAdmin && (
                          <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            <Crown className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <p className="text-sm text-gray-400 mt-0.5 truncate">{team.description}</p>
                      )}
                    </div>
                  </div>
                  {!isActive && (
                    <button
                      onClick={() => switchTeam(team.id)}
                      className="btn-secondary text-sm flex-shrink-0"
                    >
                      Switch
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{team._count.members}</p>
                    <p className="text-xs text-gray-400">Member{team._count.members !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Swords className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{team._count.matches}</p>
                    <p className="text-xs text-gray-400">Match{team._count.matches !== 1 ? "es" : ""}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mt-1 capitalize">{team.role.toLowerCase()}</p>
                    <p className="text-xs text-gray-400">Your role</p>
                  </div>
                </div>

                {/* Invite Code */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Invite code</p>
                    <p className="font-mono font-bold text-gray-800 tracking-widest text-sm">{team.inviteCode}</p>
                  </div>
                  <button
                    onClick={() => copyCode(team.inviteCode)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex-shrink-0",
                      copiedCode === team.inviteCode
                        ? "bg-primary-50 text-primary-700 border-primary-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {copiedCode === team.inviteCode
                      ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                      : <><Copy className="w-3.5 h-3.5" /> Copy</>
                    }
                  </button>
                </div>

                {/* Quick links (only for active team) */}
                {isActive && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <a href="/matches" className="text-xs text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                      View Matches →
                    </a>
                    <a href="/players" className="text-xs text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                      View Players →
                    </a>
                    <a href="/settings" className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                      Manage Team →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && teams.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🏸</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No teams yet</h3>
          <p className="text-gray-500 text-sm mb-5">Create a team or join one with an invite code.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create team
            </button>
            <button onClick={() => setShowJoin(true)} className="btn-secondary">
              <LogIn className="w-4 h-4" /> Join team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
