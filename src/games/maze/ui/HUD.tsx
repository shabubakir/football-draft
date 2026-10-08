"use client";

interface HudData {
  stamina: number;
  battery: number;
  fuses: number;
  fusesTotal: number;
}

export function HUD({ data }: { data: HudData }) {
  const allCollected = data.fusesTotal > 0 && data.fuses >= data.fusesTotal;
  return (
    <>
      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className="h-1 w-1 rounded-full bg-white/60" />
      </div>

      {/* Objective */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 pointer-events-none select-none">
        <div
          className={`px-4 py-1.5 rounded-full border text-[11px] font-bold tracking-[2px] ${
            allCollected
              ? "border-emerald-500/60 bg-emerald-950/70 text-emerald-300"
              : "border-stone-700 bg-black/60 text-stone-300"
          }`}
        >
          {allCollected ? "ВЫХОД ОТКРЫТ — ИЩИ СИНИЙ МАЯК" : "ИЩИ ПРЕДОХРАНИТЕЛИ"}
        </div>
      </div>

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
    </>
  );
}
