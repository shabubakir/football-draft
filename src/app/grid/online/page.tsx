import GameShell from "@/components/game-shell";
import { GridOnline } from "@/components/grid-online";

export const metadata = {
  title: "Сетка 9 онлайн — Football Draft",
};

export default function GridOnlinePage() {
  return (
    <GameShell
      theme="grid-9"
      maxWidth="max-w-5xl"
      header={{
        badge: "ONLINE · PvP",
        title: "СЕТКА 9 ОНЛАЙН",
        subtitle: "Крестики-нолики по 9 пересечениям — с другом в реальном времени",
      }}
    >
      <GridOnline />
    </GameShell>
  );
}
