import { Nav } from "@/components/nav";
import GeoMultiplayerLoader from "../geoguessr-mp-client";

export const metadata = {
  title: "GeoGuessr Lite — Multiplayer — Football Draft",
};

// Ссылка на комнату: /geoguessr/multiplayer/ABC123
export default function GeoMultiplayerRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  return (
    <main className="min-h-screen w-full bg-stone-100">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Nav />
        <div className="mt-8 sm:mt-10">
          <GeoMultiplayerLoader params={params} />
        </div>
      </div>
    </main>
  );
}
