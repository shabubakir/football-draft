import type { Metadata } from "next";
import LoginPage from "@/components/login-page";

export const metadata: Metadata = {
  title: "Вход | ShahGames",
};

export default function LoginRoute() {
  return <LoginPage />;
}
