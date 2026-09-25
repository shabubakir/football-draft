import { Nav } from "@/components/nav";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Викторина — подключиться — Football Draft",
};

export default function ShortJoinCodePage() {
  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10">
        <QuizOnline />
      </div>
    </main>
  );
}
