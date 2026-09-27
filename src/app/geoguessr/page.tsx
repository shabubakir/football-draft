import GameShell from "@/components/game-shell";
import GeoGuessrLoader from "./geoguessr-client";

export const metadata = {
  title: "GeoGuessr Lite — Football Draft",
};

export default function GeoGuessrPage() {
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
      <GeoGuessrLoader />
    </GameShell>
  );
}
