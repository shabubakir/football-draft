import { Nav } from "@/components/nav";
import { GridOnline } from "@/components/grid-online";

export const metadata = {
  title: "Сетка 9 — подключиться — Football Draft",
  // Не кэшируем: гость заходит по ссылке с кодом комнаты
  dynamic: "force-dynamic" as const,
};

export default function GridJoinPage() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <GridOnline />
      </div>
    </main>
  );
}
