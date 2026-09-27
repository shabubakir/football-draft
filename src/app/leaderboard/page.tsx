import type { Metadata } from "next";
import LeaderboardClient from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Лидерборд | ShahGames",
};

export default function LeaderboardRoute() {
  return <LeaderboardClient />;
}
