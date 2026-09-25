import { Nav } from "@/components/nav";
import { GuessGame } from "@/components/guess-game";

export const metadata = {
  title: "Угадай игрока — Football Draft",
};

export default function GuessPage() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <GuessGame />
      </div>
    </main>
  );
}
