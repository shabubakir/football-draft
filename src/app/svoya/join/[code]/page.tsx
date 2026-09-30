import GameShell from "@/components/game-shell";
import { SvoyaIgra } from "@/components/svoya-igra";

export const metadata = {
  title: "Своя игра — подключиться — Football Draft",
  // Не кэшируем: гость заходит по ссылке с кодом комнаты
  dynamic: "force-dynamic" as const,
};

export default function SvoyaJoinPage() {
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
