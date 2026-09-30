import GameShell from "@/components/game-shell";
import { SvoyaIgra } from "@/components/svoya-igra";

export const metadata = {
  title: "Своя игра онлайн — Football Draft",
};

export default function SvoyaPage() {
  return (
    <GameShell
      theme="quiz"
      maxWidth="max-w-5xl"
      header={{
        badge: "СВОЯ ИГРА",
        title: "СВОЯ ИГРА ОНЛАЙН",
        subtitle: "5×5 · до 6 игроков · таймер и очки",
      }}
    >
      <SvoyaIgra />
    </GameShell>
  );
}
