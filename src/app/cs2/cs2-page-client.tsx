"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { CS2CaseSimulator } from "@/components/cs2-case";
import { CaseBattle } from "@/components/case-battle";

export function CS2PageClient() {
  const [battleKey, setBattleKey] = useState(0);
  const [joinCode, setJoinCode] = useState("");

  // Авто-вход в битву по ссылке /cs2?code=XXXXXX (для кнопки «ПОДЕЛИТЬСЯ»)
  const params = useSearchParams();
  const codeParam = params.get("code");
  useEffect(() => {
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
      setBattleKey((k) => k + 1);
    }
  }, [codeParam]);

  const battleOn = battleKey > 0;

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav dark />
      {battleOn ? (
        <div className="mt-10">
          <CaseBattle
            key={battleKey + ":" + joinCode}
            initialPhase="join"
            initialJoinCode={joinCode}
            onExit={() => {
              setBattleKey(0);
              setJoinCode("");
            }}
          />
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <CS2CaseSimulator />

          {/* ================= ИГРАТЬ С ДРУГОМ ================= */}
          <div className="relative overflow-hidden rounded-2xl border border-[#ffd700]/30 bg-gradient-to-br from-[#ffd700]/10 via-stone-950/50 to-stone-950/80 p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#ffd700]/10 blur-3xl" />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#ffd700]/15 border border-[#ffd700]/40 text-[#ffd700] text-[10px] font-black tracking-widest">
                  ⚔ 1 НА 1
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  ИГРАТЬ <span className="text-[#ffd700]">С ДРУГОМ</span>
                </h2>
              </div>
              <p className="text-sm text-stone-300 max-w-xl">
                CASE BATTLE: открывайте кейсы вместе и узнайте, кто соберёт больше
                виртуальных денег. У каждого — банк $10 000 и 10 открытий. Все деньги
                и предметы — вымышленные.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setJoinCode("");
                    setBattleKey((k) => k + 1);
                  }}
                  className="px-6 py-3.5 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 transition shadow-lg shadow-[#ffd700]/20"
                >
                  СОЗДАТЬ КОМНАТУ
                </button>
                <button
                  onClick={() => {
                    setJoinCode("");
                    setBattleKey((k) => k + 1);
                  }}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/10 transition"
                >
                  ВОЙТИ ПО КОДУ
                </button>
              </div>
            </div>
          </div>

          {/* ================= МИНИ-ИГРЫ CS2 ================= */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/cs2/aim"
              className="group relative overflow-hidden rounded-2xl border border-[#ffd700]/25 bg-gradient-to-br from-[#ffd700]/10 via-stone-950/60 to-stone-950/90 p-6 hover:border-[#ffd700]/50 transition"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#eb4b4b]/10 blur-3xl" />
              <div className="relative space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#eb4b4b]/15 border border-[#eb4b4b]/40 text-[#eb4b4b] text-[10px] font-black tracking-widest">
                  🎯 РЕАКЦИЯ
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  CS2 <span className="text-[#ffd700]">AIM</span>
                </h3>
                <p className="text-sm text-stone-400 max-w-xs">
                  30 секунд кликай по мишеням. Считаем реакцию, точность и лучший счёт.
                </p>
                <div className="text-xs font-black text-[#ffd700] tracking-wider group-hover:translate-x-1 transition-transform">
                  ИГРАТЬ →
                </div>
              </div>
            </Link>

            <Link
              href="/cs2/higher-lower"
              className="group relative overflow-hidden rounded-2xl border border-[#ffd700]/25 bg-gradient-to-br from-[#ffd700]/10 via-stone-950/60 to-stone-950/90 p-6 hover:border-[#ffd700]/50 transition"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#4b69ff]/10 blur-3xl" />
              <div className="relative space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#4b69ff]/15 border border-[#4b69ff]/40 text-[#4b69ff] text-[10px] font-black tracking-widest">
                  💰 ЦЕНЫ
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  SKIN <span className="text-[#ffd700]">HIGHER / LOWER</span>
                </h3>
                <p className="text-sm text-stone-400 max-w-xs">
                  Два скина из базы кейсов — угадай, какой дороже. 10 раундов, streak и бонусы.
                </p>
                <div className="text-xs font-black text-[#ffd700] tracking-wider group-hover:translate-x-1 transition-transform">
                  ИГРАТЬ →
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
