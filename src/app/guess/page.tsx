import GameShell from "@/components/game-shell";
import { GuessGame } from "@/components/guess-game";

export const metadata = {
  title: "Угадай игрока — Football Draft",
};

export default function GuessPage() {
  return (
    <GameShell
      theme="guess-player"
      maxWidth="max-w-6xl"
      header={{
        badge: "FOOTBALL DETECTIVE",
        title: "УГАДАЙ ИГРОКА",
        subtitle: "Раскрой личность футболиста по подсказкам",
      }}
    >
      <GuessGame />
    </GameShell>
  );
}
