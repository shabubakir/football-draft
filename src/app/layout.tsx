import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { MigrationPrompt } from "@/components/migration-prompt";
import { ToastContainer } from "@/components/toast-container";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Draft — футбольные игры с друзьями",
  description:
    "Угадай футболиста за 10 попыток и сыграй в Сетку 9 онлайн с друзьями в реальном времени.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-stone-950 text-stone-100">
        <AuthProvider>
          {children}
          <MigrationPrompt />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
