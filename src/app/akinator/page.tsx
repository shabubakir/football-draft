import { Nav } from "@/components/nav";
import { AkinatorGame } from "@/games/akinator/akinator";

export const metadata = {
  title: "Football Akinator — Football Draft",
  description:
    "Загадай любого футболиста, клуб или объект из мира футбола. Джинн попробует угадать за несколько вопросов.",
};

export default function AkinatorPage() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <AkinatorGame />
      </div>
    </main>
  );
}
