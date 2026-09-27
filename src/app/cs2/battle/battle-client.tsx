"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { CaseBattle } from "@/components/case-battle";

export function CS2BattleClient() {
  // Авто-вход по ссылке /cs2/battle?code=XXXXXX (кнопка «ПОДЕЛИТЬСЯ»)
  const params = useSearchParams();
  const codeParam = params.get("code");

  return (
    <main className="min-h-screen bg-stone-950 text-white flex flex-col">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-80"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%, rgba(255,215,0,0.10) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Nav dark />
      <div className="mt-10">
        <CaseBattle
          initialPhase="join"
          initialJoinCode={codeParam ? codeParam.toUpperCase() : ""}
          autoLeaveIfFull
          onExit={() => {
            window.location.href = "/cs2";
          }}
        />
      </div>
      <div className="mt-8 text-center">
        <Link href="/cs2" className="text-xs text-stone-500 hover:text-stone-300">
          ← к CS2 кейсам
        </Link>
      </div>
      </div>
    </main>
  );
}
