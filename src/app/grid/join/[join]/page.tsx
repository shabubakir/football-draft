import GameShell from "@/components/game-shell";
import { GridOnline } from "@/components/grid-online";

export const metadata = {
  title: "Сетка 9 — подключиться — Football Draft",
  // Не кэшируем: гость заходит по ссылке с кодом комнаты
  dynamic: "force-dynamic" as const,
};

export default function GridJoinPage() {
  return (
    <GameShell
      theme="grid-9"
      maxWidth="max-w-5xl"
      header={{
        badge: "ONLINE · PvP",
        title: "СЕТКА 9 — ПОДКЛЮЧЕНИЕ",
        subtitle: "Вы пришли по приглашению друга",
      }}
    >
      <GridOnline />
    </GameShell>
  );
}
