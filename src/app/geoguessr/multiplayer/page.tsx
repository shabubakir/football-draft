import GameShell from "@/components/game-shell";
import GeoMultiplayerLoader from "./geoguessr-mp-client";

export const metadata = {
  title: "GeoGuessr Lite — Multiplayer — Football Draft",
};

export default function GeoMultiplayerPage({
  params,
}: {
  params: Promise<{ roomCode?: string }>;
}) {
  return (
    <GameShell
      theme="geoguessr"
      maxWidth="max-w-5xl"
      header={{
        badge: "WORLD TOUR",
        title: "GEO GUESSR LITE",
        subtitle: "Угадай, где ты находишься, — 5 раундов, один мир",
      }}
    >
      <GeoMultiplayerLoader params={params} />
    </GameShell>
  );
}
