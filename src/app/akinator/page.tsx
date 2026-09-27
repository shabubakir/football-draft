import GameShell from "@/components/game-shell";
import { AkinatorGame } from "@/games/akinator/akinator";

export const metadata = {
  title: "Football Akinator — Football Draft",
  description:
    "Загадай любого футболиста, клуб или объект из мира футбола. Джинн попробует угадать за несколько вопросов.",
};

export default function AkinatorPage() {
  return (
    <GameShell
      theme="akinator"
      maxWidth="max-w-6xl"
      header={{
        badge: "MYSTICAL PREDICTION",
        title: "ФУТБОЛЬНЫЙ ДЖИНН",
        subtitle: "Загадай игрока — дух угадает за несколько вопросов",
      }}
    >
      <AkinatorGame />
    </GameShell>
  );
}
