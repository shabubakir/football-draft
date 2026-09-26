import { Nav } from "@/components/nav";
import { CS2CaseSimulator } from "@/components/cs2-case";

export const metadata = {
  title: "CS2 Cases — Football Draft",
};

export default function CS2Page() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <CS2CaseSimulator />
      </div>
    </main>
  );
}
