import GameShell from "@/components/game-shell";
import { DraftGame } from "@/components/draft-game";

export const metadata = {
  title: "Драфт — Football Draft",
};

export default function DraftPage() {
  return (
    <GameShell
      theme="football-draft"
      maxWidth="max-w-6xl"
      header={{
        badge: "TACTICAL MODE",
        title: "СОБЕРИ СВОЮ КОМАНДУ",
        subtitle: "Выбери схему, проведи драфт, выйди в финал",
      }}
    >
      <DraftGame />
    </GameShell>
  );
}
