"use client";

export interface HudData {
  stamina: number;
  battery: number;
  fuses: number;
  fusesTotal: number;
  banked: number;
  quota: number;
  carried: number;
  timeLeft: number;
  event: string | null;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString();
}

export function HUD({ data }: { data: HudData }) {
  const quotaMet = data.banked >= data.quota;
  const pct = data.quota > 0 ? Math.min(100, (data.banked / data.quota) * 100) : 0;

  return (
    <>
      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className="h-1 w-1 rounded-full bg-white/60" />
      </div>

      {/* Objective / quota bar */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 pointer-events-none select-none w-72">
        <div
          className={`px-4 py-1.5 rounded-full border text-[11px] font-bold tracking-[2px] text-center ${
            quotaMet
              ? "border-emerald-500/60 bg-emerald-950/70 text-emerald-300"
              : "border-stone-700 bg-black/60 text-stone-300"
          }`}
        >
          {quotaMet
            ? "КВОТА ВЫПОЛНЕНА — ИДИ НА ПОСАДКУ"
            : `КВОТА ${fmtMoney(data.banked)} / ${fmtMoney(data.quota)}`}
        </div>
        {/* Progress bar */}
        <div className="mt-1 h-1.5 bg-stone-900/80 rounded-full overflow-hidden border border-stone-700">
          <div
            className={`h-full transition-all duration-300 ${quotaMet ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Event banner */}
      {data.event && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 pointer-events-none select-none">
          <div className="px-4 py-1 rounded bg-black/70 border border-amber-600/40 text-amber-300 text-xs font-bold tracking-wider whitespace-nowrap">
            {data.event}
          </div>
        </div>
      )}

      {/* Carried item indicator */}
      {data.carried > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-widest text-stone-400">В РУКАХ</span>
            <div className="text-xl font-black text-amber-400">{fmtMoney(data.carried)}</div>
            <div className="text-[10px] text-stone-500">Q — бросить</div>
          </div>
        </div>
      )}

      {/* Time limit */}
      <div className="absolute left-1/2 top-14 -translate-x-1/2 pointer-events-none select-none">
        <span className="text-[11px] font-bold tracking-widest text-stone-500">
          {fmtTime(data.timeLeft)}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none select-none">
        {/* Left: Stamina + Battery + Fuses */}
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
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest">
            <span className="text-stone-400">FUSES</span>
            <span className="text-amber-400">{data.fuses}</span>
            <span className="text-stone-600">/{data.fusesTotal}</span>
          </div>
        </div>

        {/* Right: Banked total */}
        <div className="text-right">
          <span className="text-[10px] font-bold tracking-widest text-stone-400">В КАЗНЕ</span>
          <div className={`text-2xl font-black ${quotaMet ? "text-emerald-400" : "text-amber-400"}`}>
            {fmtMoney(data.banked)}
          </div>
        </div>
      </div>
    </>
  );
}
