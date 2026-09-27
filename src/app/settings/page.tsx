import type { Metadata } from "next";
import SettingsPage from "@/components/settings-page";

export const metadata: Metadata = {
  title: "Настройки | Football Draft",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
