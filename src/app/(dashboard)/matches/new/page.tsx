"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2, AlertCircle, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Player { id: string; displayName: string; skillLevel: string }
interface Venue { id: string; name: string; address: string | null; courts: number }

export default function NewMatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const teamId = session?.activeTeamId;


  const [form, setForm] = useState({
    type: "SINGLES" as "SINGLES" | "DOUBLES",
    scheduledAt: format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    venueId: "",
    notes: "",
  });

  const [selectedSide1, setSelectedSide1] = useState<string[]>([]);
  const [selectedSide2, setSelectedSide2] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<null | { pair1: { id: string; name: string }[]; pair2: { id: string; name: string }[] }[]>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const { data: playersData } = useQuery({
    queryKey: ["players", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/players?teamId=${teamId}`);
      return res.json() as Promise<{ players: Player[] }>;
    },
    enabled: !!teamId,
  });

  const { data: venuesData } = useQuery({
    queryKey: ["venues", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/venues?teamId=${teamId}`);
      return res.json() as Promise<{ venues: Venue[] }>;
    },
    enabled: !!teamId,
  });

  const players = playersData?.players || [];
  const venues = venuesData?.venues || [];

  const maxPerSide = form.type === "SINGLES" ? 1 : 2;

  function togglePlayer(side: 1 | 2, playerId: string) {
    const setSelected = side === 1 ? setSelectedSide1 : setSelectedSide2;
    const selected = side === 1 ? selectedSide1 : selectedSide2;
    const otherSelected = side === 1 ? selectedSide2 : selectedSide1;

    if (otherSelected.includes(playerId)) return; // Already on other side

    if (selected.includes(playerId)) {
      setSelected(selected.filter(id => id !== playerId));
    } else if (selected.length < maxPerSide) {
      setSelected([...selected, playerId]);
    }
  }

  async function fetchAiSuggestions() {
    if (!teamId) return;
    setLoadingAi(true);
    try {
      const availablePlayerIds = players.map(p => p.id);
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, availablePlayerIds }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setAiSuggestion(data.suggestions);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingAi(false);
    }
  }

  function applySuggestion(suggestion: { pair1: { id: string; name: string }[]; pair2: { id: string; name: string }[] }) {
    setForm(prev => ({ ...prev, type: "DOUBLES" }));
    setSelectedSide1(suggestion.pair1.map(p => p.id));
    setSelectedSide2(suggestion.pair2.map(p => p.id));
    setAiSuggestion(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (selectedSide1.length !== maxPerSide) {
      setError(`Please select ${maxPerSide} player${maxPerSide > 1 ? "s" : ""} for Side 1`);
      return;
    }
    if (selectedSide2.length !== maxPerSide) {
      setError(`Please select ${maxPerSide} player${maxPerSide > 1 ? "s" : ""} for Side 2`);
      return;
    }

    setLoading(true);
    try {
      const players = [
        ...selectedSide1.map((id, i) => ({ playerId: id, side: 1, position: i + 1 })),
        ...selectedSide2.map((id, i) => ({ playerId: id, side: 2, position: i + 1 })),
      ];

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          type: form.type,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          venueId: form.venueId || undefined,
          notes: form.notes || undefined,
          players,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create match");
        return;
      }

      router.push(`/matches/${data.match.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/matches" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Match</h1>
          <p className="text-sm text-gray-500">Set up a new singles or doubles match</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Match type */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Match Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["SINGLES", "DOUBLES"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setForm(prev => ({ ...prev, type }));
                  setSelectedSide1([]);
                  setSelectedSide2([]);
                }}
                className={cn(
                  "p-4 rounded-xl border-2 text-center transition-all",
                  form.type === type
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="text-2xl mb-1">{type === "SINGLES" ? "🏸" : "👥"}</div>
                <div className="text-sm font-semibold text-gray-900">{type === "SINGLES" ? "Singles" : "Doubles"}</div>
                <div className="text-xs text-gray-400">{type === "SINGLES" ? "1v1" : "2v2"}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Venue */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">When & Where</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Date & Time *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduledAt}
                onChange={(e) => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Venue (optional)</label>
              <select
                className="input"
                value={form.venueId}
                onChange={(e) => setForm(prev => ({ ...prev, venueId: e.target.value }))}
              >
                <option value="">No venue selected</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}{v.address ? ` — ${v.address}` : ""}</option>
                ))}
              </select>
              {venues.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  <Link href="/venues" className="text-primary-600 hover:underline">Add venues</Link> to select a court.
                </p>
              )}
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Any notes for this match..."
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Select Players
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({maxPerSide} per side)
              </span>
            </h2>
            {form.type === "DOUBLES" && (
              <button
                type="button"
                onClick={fetchAiSuggestions}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                disabled={loadingAi}
              >
                {loadingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Suggestions
              </button>
            )}
          </div>

          {/* AI Suggestions */}
          {aiSuggestion && aiSuggestion.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <p className="text-xs font-semibold text-primary-700 mb-2">💡 Suggested Pairings</p>
              <div className="space-y-2">
                {aiSuggestion.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left text-xs p-2 bg-white rounded-lg hover:bg-primary-50 transition-colors border border-primary-100"
                  >
                    <span className="font-medium">{s.pair1.map(p => p.name.split(" ")[0]).join(" & ")}</span>
                    <span className="text-gray-400"> vs </span>
                    <span className="font-medium">{s.pair2.map(p => p.name.split(" ")[0]).join(" & ")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([1, 2] as const).map((side) => {
              const selected = side === 1 ? selectedSide1 : selectedSide2;
              const otherSelected = side === 1 ? selectedSide2 : selectedSide1;

              return (
                <div key={side}>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Side {side}
                    <span className="ml-1 text-primary-600">({selected.length}/{maxPerSide})</span>
                  </p>
                  <div className="space-y-1.5">
                    {players.map((player) => {
                      const isSelected = selected.includes(player.id);
                      const isOtherSide = otherSelected.includes(player.id);
                      const isDisabled = isOtherSide || (!isSelected && selected.length >= maxPerSide);

                      return (
                        <button
                          key={player.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => togglePlayer(side, player.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left text-sm transition-all border",
                            isSelected
                              ? "border-primary-400 bg-primary-50 text-primary-800"
                              : isDisabled
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 hover:border-gray-300 text-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                            isSelected ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
                          )}>
                            {player.displayName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{player.displayName}</p>
                            <p className="text-xs text-gray-400 capitalize">{player.skillLevel.toLowerCase()}</p>
                          </div>
                          {isSelected && (
                            <div className="ml-auto w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5L3.5 7L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky submit bar on mobile */}
        <div className="sticky bottom-24 lg:static lg:bottom-auto z-10 flex gap-3 bg-gray-50/80 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none py-2 lg:py-0 -mx-4 lg:mx-0 px-4 lg:px-0 border-t border-gray-100 lg:border-0">
          <Link href="/matches" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule Match
          </button>
        </div>
      </form>
    </div>
  );
}
