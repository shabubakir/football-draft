import { Nav } from "@/components/nav";
import GeoGuessrLoader from "./geoguessr-client";

export const metadata = {
  title: "GeoGuessr Lite — Football Draft",
};

export default function GeoGuessrPage() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-8 sm:mt-10">
        <GeoGuessrLoader />
      </div>
    </main>
  );
}
