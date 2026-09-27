import type { Metadata } from "next";
import RegisterPage from "@/components/register-page";

export const metadata: Metadata = {
  title: "Регистрация | Football Draft",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}
