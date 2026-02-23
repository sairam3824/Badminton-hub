"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Plus, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create team");
        return;
      }
      setSuccess(`Team "${data.team.name}" created!`);
      await update({ activeTeamId: data.team.id });
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setError("Something went wrong. Please try again.");
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
      if (!res.ok) {
        setError(data.error || "Failed to join team");
        return;
      }
      setSuccess(`Joined "${data.team.name}" successfully!`);
      await update({ activeTeamId: data.team.id });
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-gray-500">Get started by creating or joining a team.</p>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {mode === "choose" && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setMode("create")}
              className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Plus className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Create a new team</h3>
                  <p className="text-sm text-gray-500">Start fresh and invite your teammates to join.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Join existing team</h3>
                  <p className="text-sm text-gray-500">Enter an invite code shared by your team admin.</p>
                </div>
              </div>
            </button>

            {(session?.teams?.length ?? 0) > 0 && (
              <button
                onClick={() => router.push("/dashboard")}
                className="card p-4 text-center hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Continue to existing team</span>
                </div>
              </button>
            )}
          </div>
        )}

        {mode === "create" && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMode("choose")} className="text-gray-400 hover:text-gray-600">←</button>
              <h2 className="text-lg font-semibold text-gray-900">Create your team</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Team name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Smash Club"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  maxLength={50}
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What's your team about?"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  maxLength={200}
                />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create team
              </button>
            </form>
          </div>
        )}

        {mode === "join" && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMode("choose")} className="text-gray-400 hover:text-gray-600">←</button>
              <h2 className="text-lg font-semibold text-gray-900">Join a team</h2>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label">Invite code *</label>
                <input
                  type="text"
                  className="input uppercase tracking-widest"
                  placeholder="XXXXXXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-gray-400">Ask your team admin for the invite code.</p>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Join team
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
