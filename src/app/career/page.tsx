import GameShell from "@/components/game-shell";
import { CareerGame } from "@/components/career-game";

export const metadata = {
  title: "Путь футболиста — Football Draft",
};

export default function CareerPage() {
  return (
    <GameShell
      theme="career"
      maxWidth="max-w-6xl"
      header={{
        badge: "CAREER JOURNEY",
        title: "ПУТЬ ФУТБОЛИСТА",
        subtitle: "Пересобери трансферную историю легенды",
      }}
    >
      <CareerGame />
    </GameShell>
  );
}
