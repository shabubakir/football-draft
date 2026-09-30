import GameShell from "@/components/game-shell";
import LastShift from "@/games/last-shift/last-shift";

export const metadata = {
  title: "Последняя смена — Football Draft",
  description:
    "Автономный хоррор: найди три предохранителя, восстанови питание и выживи. Что-то бродит в темноте.",
};

export default function ShiftPage() {
  return (
    <GameShell
      theme="last-shift"
      maxWidth="max-w-6xl"
      header={{
        badge: "HORROR · LOCAL",
        title: "ПОСЛЕДНЯЯ СМЕНА",
        subtitle:
          "Найди три предохранителя, восстанови питание и доберись до выхода. WASD · мышь · E · F · Shift",
      }}
    >
      <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <LastShift />
      </div>
    </GameShell>
  );
}
