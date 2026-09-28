import GameShell from "@/components/game-shell";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Викторина — подключиться — Football Draft",
  // Не кэшируем: гость заходит по ссылке с кодом комнаты
  dynamic: "force-dynamic" as const,
};

export default function QuizJoinPage() {
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
