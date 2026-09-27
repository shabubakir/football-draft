import type { Metadata } from "next";
import RegisterPage from "@/components/register-page";

export const metadata: Metadata = {
  title: "Регистрация | ShahGames",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}
