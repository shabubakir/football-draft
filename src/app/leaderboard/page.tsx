import type { Metadata } from "next";
import LeaderboardClient from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Лидерборд | Football Draft",
};

export default function LeaderboardRoute() {
  return <LeaderboardClient />;
}
