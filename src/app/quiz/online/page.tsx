import GameShell from "@/components/game-shell";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Викторина онлайн — Football Draft",
};

export default function QuizOnlinePage() {
  return (
    <GameShell
      theme="quiz"
      maxWidth="max-w-4xl"
      header={{
        badge: "QUIZ SHOW",
        title: "ФУТБОЛЬНАЯ ВИКТОРИНА",
        subtitle: "Отвечай быстро — таймер не ждёт",
      }}
    >
      <QuizOnline />
    </GameShell>
  );
}
