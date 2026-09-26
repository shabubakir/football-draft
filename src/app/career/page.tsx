import { Nav } from "@/components/nav";
import { CareerGame } from "@/components/career-game";

export const metadata = {
  title: "Путь футболиста — Football Draft",
};

export default function CareerPage() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <CareerGame />
      </div>
    </main>
  );
}
