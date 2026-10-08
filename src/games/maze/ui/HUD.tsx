"use client";

import { useEffect, useState } from "react";

interface HudData {
  stamina: number;
  battery: number;
  fuses: number;
  fusesTotal: number;
}

export function HUD({ data }: { data: HudData }) {
  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none select-none">
      {/* Left: Stamina + Battery */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest text-stone-400">STAMINA</span>
          <div className="w-32 h-2 bg-stone-900/80 rounded-full overflow-hidden border border-stone-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${data.stamina}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest text-stone-400">BATTERY</span>
          <div className="w-32 h-2 bg-stone-900/80 rounded-full overflow-hidden border border-stone-700">
            <div
              className={`h-full transition-all duration-200 ${data.battery > 30 ? "bg-amber-400" : "bg-red-500"}`}
              style={{ width: `${data.battery}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Fuses */}
      <div className="text-right">
        <span className="text-[10px] font-bold tracking-widest text-stone-400">FUSES</span>
        <div className="text-2xl font-black text-amber-400">
          {data.fuses}
          <span className="text-stone-600 text-sm">/{data.fusesTotal}</span>
        </div>
      </div>
    </div>
  );
}
