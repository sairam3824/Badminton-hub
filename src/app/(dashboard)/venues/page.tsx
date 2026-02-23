"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin, Plus, Trash2, Edit3, Check, X, Loader2 } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  courts: number;
  notes: string | null;
  _count: { matches: number };
}

export default function VenuesPage() {
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const fallbackTeamId = session?.teams?.[0]?.id ?? null;
  const teamId = session?.activeTeamId ?? fallbackTeamId;
  const isAdmin = session?.teams?.find((t) => t.id === teamId)?.role === "ADMIN";

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", courts: 1, notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    if (!session.activeTeamId && fallbackTeamId) {
      void update({ activeTeamId: fallbackTeamId });
    }
  }, [session, fallbackTeamId, update]);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ["venues", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/venues?teamId=${teamId}`);
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to fetch venues");
      }
      return res.json() as Promise<{ venues: Venue[] }>;
    },
    enabled: !!teamId,
  });

  const venues = data?.venues || [];

  function resetForm() {
    setForm({ name: "", address: "", courts: 1, notes: "" });
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Please select a team first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create venue"); return; }
      queryClient.invalidateQueries({ queryKey: ["venues", teamId] });
      setShowForm(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(venueId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, ...form }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || "Failed to update venue");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["venues", teamId] });
      setEditingId(null);
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(venueId: string, matchCount: number) {
    if (matchCount > 0 && !confirm(`This venue has ${matchCount} match${matchCount !== 1 ? "es" : ""} associated. Delete anyway?`)) return;
    setError("");
    const res = await fetch("/api/venues", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || "Failed to delete venue");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["venues", teamId] });
  }

  function startEdit(venue: Venue) {
    setEditingId(venue.id);
    setForm({ name: venue.name, address: venue.address || "", courts: venue.courts, notes: venue.notes || "" });
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No active team selected</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select a team first to manage venues.
        </p>
        <Link href="/teams" className="btn-primary inline-flex">
          Go to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your team&apos;s courts and locations</p>
        </div>
        {isAdmin && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Venue
          </button>
        )}
      </div>

      {fetchError && (
        <div className="card p-4 text-sm text-red-600 border-red-200 bg-red-50">
          {(fetchError as Error).message}
        </div>
      )}

      {/* Add Venue Form */}
      {showForm && isAdmin && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Venue</h2>
          {error && <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Venue Name *</label>
                <input className="input" placeholder="e.g. Sports Center" value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Number of Courts</label>
                <input type="number" min={1} max={20} className="input" value={form.courts}
                  onChange={e => setForm(prev => ({ ...prev, courts: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <label className="label">Address (optional)</label>
              <input className="input" placeholder="Street, City" value={form.address}
                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Parking info, access codes, etc." />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Venue
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && venues.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No venues yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            {isAdmin ? "Add your courts and locations to attach them to matches." : "Ask your team admin to add venues."}
          </p>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              Add first venue
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {venues.map((venue) => {
          const isEditing = editingId === venue.id;
          return (
            <div key={venue.id} className="card p-5">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Courts</label>
                      <input type="number" min={1} max={20} className="input text-sm" value={form.courts}
                        onChange={e => setForm(p => ({ ...p, courts: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Address</label>
                    <input className="input text-sm" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label text-xs">Notes</label>
                    <input className="input text-sm" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(null); resetForm(); }} className="btn-secondary text-sm flex-1">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button onClick={() => handleUpdate(venue.id)} disabled={loading} className="btn-primary text-sm flex-1">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{venue.name}</p>
                        {venue.address && <p className="text-xs text-gray-400">{venue.address}</p>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(venue)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(venue.id, venue._count.matches)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="badge-gray">{venue.courts} court{venue.courts !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-gray-400">{venue._count.matches} match{venue._count.matches !== 1 ? "es" : ""}</span>
                  </div>
                  {venue.notes && <p className="text-xs text-gray-500 mt-2">{venue.notes}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
