import GameShell from "@/components/game-shell";
import { GridDay } from "@/components/grid-day";

export const metadata = {
  title: "Сетка дня — Football Draft",
  description:
    "Ежедневная Сетка 9: один игрок, три ошибки и общий для всех рейтинг.",
};

export default function GridDayPage() {
  return (
    <GameShell
      theme="grid-9"
      maxWidth="max-w-5xl"
      header={{
        badge: "DAILY CHALLENGE",
        title: "СЕТКА ДНЯ",
        subtitle: "Один футболист на каждое пересечение. Три ошибки — провал.",
      }}
    >
      <GridDay />
    </GameShell>
  );
}
