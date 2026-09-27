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
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
    </main>
  );
}
