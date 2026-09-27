import { Nav } from "@/components/nav";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Викторина — подключиться — Football Draft",
};

export default function ShortJoinPage() {
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
