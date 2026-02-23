"use client";

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div className="w-full bg-amber-400 text-amber-900 text-center text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 z-50">
      <span className="inline-flex items-center gap-1">
        <span className="bg-amber-900 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          Demo
        </span>
        You are viewing a demo. Data is pre-loaded and for exploration only.
      </span>
    </div>
  );
}
