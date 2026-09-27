import { Nav } from "@/components/nav";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Викторина — подключиться — Football Draft",
  // Не кэшируем: гость заходит по ссылке с кодом комнаты
  dynamic: "force-dynamic" as const,
};

export default function QuizJoinPage() {
  return (
    <main className="min-h-screen w-full bg-stone-100">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Nav />
        <div className="mt-10">
          <QuizOnline />
        </div>
      </div>
    </main>
  );
}
