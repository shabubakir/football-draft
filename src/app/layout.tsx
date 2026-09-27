import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { MigrationPrompt } from "@/components/migration-prompt";
import { ToastContainer } from "@/components/toast-container";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Football Draft — футбольные игры с друзьями",
  description:
    "Угадай футболиста за 10 попыток и сыграй в Сетку 9 онлайн с друзьями в реальном времени.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
