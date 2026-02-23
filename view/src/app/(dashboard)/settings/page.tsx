"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Copy, Check, Users, Crown, UserMinus, AlertTriangle, LogOut, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
  player: { id: string; displayName: string } | null;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const teamId = session?.activeTeamId;
  const activeTeam = session?.teams?.find(t => t.id === teamId);
  const isAdmin = activeTeam?.role === "ADMIN";

  const [copied, setCopied] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const { data } = useQuery({
    queryKey: ["members", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/members`);
      return res.json() as Promise<{ members: TeamMember[] }>;
    },
    enabled: !!teamId,
  });

  const members = data?.members || [];

  function copyInviteCode() {
    if (!activeTeam?.inviteCode) return;
    navigator.clipboard.writeText(activeTeam.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleRole(member: TeamMember) {
    setUpdatingRole(member.id);
    setActionError("");
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, role: newRole }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setActionError(payload?.error || "Failed to update role");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["members", teamId] });
    } finally {
      setUpdatingRole(null);
    }
  }

  async function removeMember(member: TeamMember) {
    if (!confirm(`Remove ${member.user.name} from the team?`)) return;
    setRemovingMember(member.id);
    setActionError("");
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setActionError(payload?.error || "Failed to remove member");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["members", teamId] });
    } finally {
      setRemovingMember(null);
    }
  }

  async function leaveTeam() {
    if (!confirm("Are you sure you want to leave this team? You can rejoin with the invite code.")) return;
    const myMember = members.find(m => m.user.id === session?.user.id);
    if (!myMember) return;
    setActionError("");

    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: myMember.id }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setActionError(payload?.error || "Failed to leave team");
      return;
    }

    const remainingTeams = session?.teams?.filter(t => t.id !== teamId) || [];
    await update({ activeTeamId: remainingTeams[0]?.id || null });
    window.location.href = remainingTeams.length > 0 ? "/dashboard" : "/onboarding";
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeTeam?.name}</p>
      </div>

      {actionError && (
        <div className="card p-3 text-sm text-red-600 border-red-200 bg-red-50">
          {actionError}
        </div>
      )}

      {/* Invite Code */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          Invite Members
        </h2>
        <p className="text-sm text-gray-500 mb-4">Share this code with players to join your team.</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-center text-lg font-mono font-bold tracking-[0.3em] text-gray-900">
              {activeTeam?.inviteCode}
            </p>
          </div>
          <button onClick={copyInviteCode} className={cn("btn-secondary flex-shrink-0", copied && "text-primary-600 border-primary-200 bg-primary-50")}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Members can join at <span className="font-mono">badmintonhub.com/onboarding</span> → &quot;Join existing team&quot;
        </p>
      </div>

      {/* Team Members */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Members
            <span className="ml-2 text-sm font-normal text-gray-400">({members.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {members.map((member) => {
            const isMe = member.user.id === session?.user.id;
            const isLastAdmin = member.role === "ADMIN" && members.filter(m => m.role === "ADMIN").length <= 1;

            return (
              <div key={member.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-sm font-bold">{member.user.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-gray-900 truncate">{member.user.name}</p>
                    {isMe && <span className="text-xs text-gray-400">(you)</span>}
                    {member.role === "ADMIN" && (
                      <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{member.user.email}</p>
                </div>

                <div className="flex items-center gap-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                    member.role === "ADMIN" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-600"
                  )}>
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </span>

                  {isAdmin && !isMe && (
                    <>
                      <button
                        onClick={() => toggleRole(member)}
                        disabled={!!updatingRole || isLastAdmin}
                        title={member.role === "ADMIN" ? "Remove admin" : "Make admin"}
                        className="ml-1 p-1.5 rounded-lg text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 transition-colors disabled:opacity-50"
                      >
                        {updatingRole === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => removeMember(member)}
                        disabled={!!removingMember || isLastAdmin}
                        title="Remove member"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {removingMember === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Account */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Your Account</h2>
        <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold">{session?.user.name?.[0]}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{session?.user.name}</p>
            <p className="text-sm text-gray-400">{session?.user.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          {!isAdmin && (
            <button
              onClick={leaveTeam}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Leave Team
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* All Teams */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Your Teams</h2>
        <div className="space-y-2">
          {session?.teams?.map(team => (
            <div key={team.id} className={cn("flex items-center gap-3 p-3 rounded-xl", team.id === teamId ? "bg-primary-50 border border-primary-100" : "bg-gray-50")}>
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
                team.id === teamId ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-600"
              )}>
                {team.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{team.name}</p>
                <p className="text-xs text-gray-400 capitalize">{team.role.toLowerCase()}</p>
              </div>
              {team.id === teamId && <span className="badge-green text-xs">Active</span>}
            </div>
          ))}
          <button
            onClick={() => window.location.href = "/onboarding"}
            className="w-full text-sm text-primary-600 hover:text-primary-700 text-center py-2 hover:bg-primary-50 rounded-xl transition-colors"
          >
            + Join or create another team
          </button>
        </div>
      </div>
    </div>
  );
}
