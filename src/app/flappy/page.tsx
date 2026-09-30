import GameShell from "@/components/game-shell";
import { FlappyBirdGame } from "@/games/flappy-bird/flappy-bird";

export const metadata = {
  title: "Goal Flappy — Football Draft",
  description:
    "Неоновый аркадный полёт: пролети между трубами, набирай очки и побей свой рекорд.",
};

export default function FlappyPage() {
  return (
    <GameShell
      theme="flappy-bird"
      maxWidth="max-w-3xl"
      header={{
        badge: "ARCADE · NEON SKY",
        title: "GOAL FLAPPY",
        subtitle:
          "Пролети между трубами — чем дальше, тем быстрее. Space / клик / тап",
      }}
    >
      <FlappyBirdGame />
    </GameShell>
  );
}
