"use client";

import dynamic from "next/dynamic";

const MazeGame = dynamic(() => import("@/games/maze/main").then((m) => m.MazeGame), {
  ssr: false,
});

export default function MazePage() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <MazeGame />
    </main>
  );
}
