import type { Metadata } from "next";
import SettingsPage from "@/components/settings-page";

export const metadata: Metadata = {
  title: "Настройки | ShahGames",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
