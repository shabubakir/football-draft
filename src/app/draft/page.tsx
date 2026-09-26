import { Nav } from "@/components/nav";
import { DraftGame } from "@/components/draft-game";

export const metadata = {
  title: "Драфт — Football Draft",
};

export default function DraftPage() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <DraftGame />
      </div>
    </main>
  );
}
